plugins {
    id("org.springframework.boot") version "3.2.5"
    id("io.spring.dependency-management") version "1.1.7"
    java
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
}

dependencies {
    implementation(project(":core"))

    implementation(libs.spring.boot.starter.web)

    implementation(kotlin("stdlib"))
}