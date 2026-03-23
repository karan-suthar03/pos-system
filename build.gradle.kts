// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.jetbrains.kotlin.jvm) apply false
}

tasks.register<Copy>("prepareDesktopAdmin") {

    dependsOn(":admin_desktop:backend:build")

    from(project(":admin_desktop:backend").layout.buildDirectory.dir("libs"))
    include("*.jar")

    into("electron")

    rename { "core.jar" }
}

