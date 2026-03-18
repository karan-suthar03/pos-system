plugins {
    java
}

group = "solutions.triniti"
version = "1.0"

//repositories {
//    mavenCentral()
//}

dependencies {
    implementation(project(":core"))
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