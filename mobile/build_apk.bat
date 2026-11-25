@echo off
echo ========================================================
echo       WEZEY MOBILE APK COMPILATION SCRIPT
echo ========================================================
echo.
echo 1. Building React Production Assets...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Web build failed.
    pause
    exit /b %errorlevel%
)

echo.
echo 2. Syncing Native Android Project & Plugins...
call npx cap sync android
if %errorlevel% neq 0 (
    echo [ERROR] Capacitor sync failed.
    pause
    exit /b %errorlevel%
)

echo.
echo 3. Checking Java / Android Build Environment...
if exist "C:\Android\jdk-21\bin\java.exe" (
    set "JAVA_HOME=C:\Android\jdk-21"
    set "PATH=C:\Android\jdk-21\bin;%PATH%"
)
if exist "C:\Android\Sdk" (
    set "ANDROID_HOME=C:\Android\Sdk"
    set "ANDROID_SDK_ROOT=C:\Android\Sdk"
    set "PATH=C:\Android\Sdk\platform-tools;%PATH%"
)
set "GRADLE_OPTS=-Djava.net.preferIPv4Stack=true"
where java >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Java detected. Compiling Android APK via Gradle...
    cd android
    call gradlew.bat assembleDebug --no-daemon
    if %errorlevel% equ 0 (
        echo.
        echo ========================================================
        echo [SUCCESS] APK built successfully!
        echo Location: mobile\android\app\build\outputs\apk\debug\app-debug.apk
        echo ========================================================
    ) else (
        echo [WARN] Gradle build encountered an issue. You can open Android Studio via: npx cap open android
    )
    cd ..
) else (
    echo [INFO] JAVA_HOME or Java CLI was not found in PATH.
    echo.
    echo Your Android project is 100%% synced and ready at:
    echo   c:\Users\nk333\Downloads\Blind\mobile\android
    echo.
    echo To build your APK in 1 click:
    echo   Option A: Open the project in Android Studio with command:
    echo             cd mobile
    echo             npx cap open android
    echo             Then click: Build > Build APK(s)
    echo.
    echo   Option B: Install Java JDK 17+ or 21 and run this script again.
)

echo.
echo ========================================================
pause
