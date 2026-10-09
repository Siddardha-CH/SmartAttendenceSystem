package com.smartattendance.backend.security;

import com.smartattendance.backend.model.User;
import com.smartattendance.backend.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.util.Optional;

/**
 * Runs before every /api request and decides whether it is allowed.
 *
 *  1. Public endpoints (login, health check, CORS pre-flight) pass straight through.
 *  2. Everything else needs an "Authorization: Bearer <token>" header with a valid token.
 *  3. The token's user must still exist and be active (so disabling a user takes effect immediately).
 *  4. The user's role must be allowed to call that endpoint (see {@link #isAllowed}).
 */
@Component
public class AuthInterceptor implements HandlerInterceptor {

    private final TokenService tokenService;
    private final UserRepository userRepository;

    public AuthInterceptor(TokenService tokenService, UserRepository userRepository) {
        this.tokenService = tokenService;
        this.userRepository = userRepository;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws IOException {
        String method = request.getMethod();
        String path = request.getRequestURI();

        if ("OPTIONS".equals(method) || isPublic(method, path)) {
            return true;
        }

        String header = request.getHeader("Authorization");
        String token = header != null && header.startsWith("Bearer ") ? header.substring(7) : null;

        Optional<User> user = tokenService.verify(token)
                .flatMap(auth -> userRepository.findById(auth.id()))
                .filter(u -> "active".equals(u.getStatus()));

        if (user.isEmpty()) {
            return reject(response, HttpServletResponse.SC_UNAUTHORIZED, "Please log in again");
        }

        // Use the role stored in the database (not the one in the token) so role changes apply immediately.
        AuthUser authUser = new AuthUser(user.get().getId(), user.get().getRole());
        if (!isAllowed(authUser, method, path)) {
            return reject(response, HttpServletResponse.SC_FORBIDDEN, "You do not have permission to do this");
        }

        request.setAttribute(AuthUser.REQUEST_ATTRIBUTE, authUser);
        return true;
    }

    static boolean isPublic(String method, String path) {
        return path.equals("/api/health")
                || ("POST".equals(method) && path.equals("/api/users/login"));
    }

    /** The permission table. Anything not listed here is readable by every logged-in user. */
    static boolean isAllowed(AuthUser user, String method, String path) {
        boolean isRead = "GET".equals(method);

        if (path.equals("/api/users/me")) return true;
        if (path.startsWith("/api/users")) return user.isAdmin();
        if (path.startsWith("/api/admin")) return user.isAdmin();
        if (path.startsWith("/api/settings")) return isRead || user.isAdmin();
        if (path.startsWith("/api/institutes") || path.startsWith("/api/classes")) return isRead || user.isAdmin();
        if (path.equals("/api/attendance/clear-history")) return user.isAdmin();
        if (path.startsWith("/api/attendance") || path.startsWith("/api/students")) {
            return isRead || user.canTakeAttendance();
        }
        // /api/preferences/{userId} does its own "only your own preferences" check in the controller.
        return true;
    }

    private boolean reject(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"" + message + "\"}");
        return false;
    }
}
