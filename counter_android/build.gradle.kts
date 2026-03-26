plugins {
    alias(libs.plugins.android.application)
}

val adminApplicationId = providers.gradleProperty("adminApplicationId")
    .orElse("solutions.triniti.admin")
    .get()
val adminProviderAuthority = providers.gradleProperty("adminProviderAuthority")
    .orElse("${adminApplicationId}.provider")
    .get()

android {
    namespace = "solutions.triniti.counter"
    compileSdk = 36

    buildFeatures {
        buildConfig = true
    }

    defaultConfig {
        applicationId = "solutions.triniti.counter"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
        buildConfigField("String", "ADMIN_PROVIDER_AUTHORITY", "\"${adminProviderAuthority}\"")
        manifestPlaceholders["adminPackage"] = adminApplicationId
        manifestPlaceholders["adminProviderAuthority"] = adminProviderAuthority

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}

dependencies {

    implementation(project(":core"))
    implementation(libs.gson)

    implementation(libs.appcompat)
    implementation(libs.material)
    implementation(libs.activity)
    implementation(libs.constraintlayout)
    testImplementation(libs.junit)
    androidTestImplementation(libs.ext.junit)
    androidTestImplementation(libs.espresso.core)
}