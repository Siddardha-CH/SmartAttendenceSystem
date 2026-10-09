package com.smartattendance.backend.security;

/** The user making the current request, as proven by their token. */
public record AuthUser(String id, String role) {

    public static final String ADMIN = "admin";
    public static final String TEACHER = "teacher";
    public static final String VIEWER = "viewer";

    /** Name of the request attribute the {@link AuthInterceptor} stores this object under. */
    public static final String REQUEST_ATTRIBUTE = "authUser";

    public boolean isAdmin() {
        return ADMIN.equals(role);
    }

    public boolean canTakeAttendance() {
        return ADMIN.equals(role) || TEACHER.equals(role);
    }
}
