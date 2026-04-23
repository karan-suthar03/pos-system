// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.jetbrains.kotlin.jvm) apply false
}

tasks.register<Copy>("prepareDesktopAdmin") {

    dependsOn(":java_runtime:build")

    from(project(":java_runtime").layout.buildDirectory.dir("libs"))
    include("java_runtime-*.jar")

    into("desktop/electron")

    rename { "core.jar" }
}

