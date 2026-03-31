# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM maven:3.9.6-eclipse-temurin-17 AS builder

WORKDIR /app

# Cache dependencies first
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and build
COPY src ./src
RUN mvn -DskipTests clean package

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copy the fat JAR from the build stage
COPY --from=builder /app/target/backend-0.0.1-SNAPSHOT.jar app.jar

# Expose the port (Render injects $PORT at runtime)
EXPOSE 8080

# Run with:
#  - Container-aware memory limits (fits on Render free 512MB)
#  - Max 75% of available RAM for heap
#  - Faster entropy source for Linux containers
#  - Production Spring profile
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-Dspring.profiles.active=prod", \
  "-jar", "app.jar"]
