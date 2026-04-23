pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "pos-system"
include(":counter_android")
project(":counter_android").projectDir = file("android/counter_android")
include(":admin_android")
project(":admin_android").projectDir = file("android/admin_android")
include(":core")
include(":backend")
include(":java_runtime")
project(":java_runtime").projectDir = file("desktop/java-runtime")