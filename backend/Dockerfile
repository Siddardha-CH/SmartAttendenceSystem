# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app

# Download dependencies first so Docker can cache this layer between builds
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and build the runnable JAR (tests run in CI, not here)
COPY src ./src
RUN mvn -B -DskipTests clean package

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Run as an unprivileged user instead of root
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder /app/target/backend-0.0.1-SNAPSHOT.jar app.jar
USER app

# Render injects $PORT at runtime; 8080 is the fallback
EXPOSE 8080

# JVM flags sized for Render's free tier (512 MB RAM):
#  - MaxRAMPercentage: heap may use 70% of the container's memory, leaving room for metaspace/threads
#  - SerialGC + small thread stacks: lowest memory overhead for a small, low-traffic service
#  - prod profile: loads application-prod.properties
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=70.0", \
  "-XX:+UseSerialGC", \
  "-Xss512k", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-Dspring.profiles.active=prod", \
  "-jar", "app.jar"]
