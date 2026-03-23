plugins {
    java
    application
}

group = "solutions.triniti"
version = "1.0"

//repositories {
//    mavenCentral()
//}

dependencies {
    implementation(project(":core"))

    implementation("org.xerial:sqlite-jdbc:3.45.1.0")
    implementation("com.google.code.gson:gson:2.10.1")
}

tasks.jar {
    manifest {
        attributes["Main-Class"] = "solutions.triniti.Main"
    }

    duplicatesStrategy = DuplicatesStrategy.EXCLUDE

    from({
        configurations.runtimeClasspath.get().map {
            if (it.isDirectory) it else zipTree(it)
        }
    })
}

tasks.named<Jar>("jar") {
    dependsOn(":core:jar")
}

application {
    mainClass.set("solutions.triniti.Main") // ← your real class
}

