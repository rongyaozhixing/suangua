#!/bin/bash
# ============================================================
# 小六壬占 · 一键发布新版脚本
# 用法: ./release.sh <版本号> [更新说明]
# 示例: ./release.sh 1.0.7 "新增某某功能"
# 自动完成: 内置网页同步 → 升版本号 → 构建 APK → 上传 GitHub
#           Release → 更新 version.json(OSS+GitHub+Gitee) → 桌面交付
# ============================================================
set -e

VER="$1"
NOTE="${2:-发布新版本}"

if [ -z "$VER" ]; then
  echo "用法: ./release.sh <版本号> [更新说明]"
  exit 1
fi

cd "E:/reasonix/computer use/suangua-app"
echo "══════ 发布 v$VER ══════"

# 1. 同步网页 → APK 内置离线版
echo "[1/6] 同步网页到内置 assets..."
rm -rf android/app/src/main/assets/web
mkdir -p android/app/src/main/assets/web
cp -r index.html css js assets android/app/src/main/assets/web/
rm -f android/app/src/main/assets/web/assets/hand-left.png android/app/src/main/assets/web/assets/hand-photo.png

# 2. 升版本号
echo "[2/6] 版本号 -> $VER ..."
CODE=$(grep -oE 'versionCode [0-9]+' android/app/build.gradle | grep -oE '[0-9]+')
NEWCODE=$((CODE + 1))
sed -i "s/versionCode $CODE/versionCode $NEWCODE/; s/versionName \"[0-9.]*\"/versionName \"$VER\"/" android/app/build.gradle
echo "      versionCode $CODE -> $NEWCODE"

# 3. 构建 APK（无空格路径）
echo "[3/6] Gradle 构建..."
rm -rf /c/build/xiaoliuren
cp -r android /c/build/xiaoliuren
cd /c/build/xiaoliuren
export JAVA_HOME="C:/jdk17"
export ANDROID_HOME="C:/Android/sdk"
cmd //c "C:\\gradle\\gradle-8.7\\bin\\gradle.bat --no-daemon --console=plain assembleRelease" > /c/downloads/gradle-release.log 2>&1 || { echo "构建失败，见 /c/downloads/gradle-release.log"; exit 1; }
APK=/c/build/xiaoliuren/app/build/outputs/apk/release/app-release.apk
ls -la "$APK"

# 4. 上传 GitHub Release（asset 名固定 app-release.apk）
cd "E:/reasonix/computer use/suangua-app"
echo "[4/6] 上传 GitHub Release v$VER ..."
cp "$APK" app-release.apk
if gh release view "v$VER" --repo rongyaozhixing/suangua >/dev/null 2>&1; then
  gh release upload "v$VER" app-release.apk --repo rongyaozhixing/suangua --clobber
else
  gh release create "v$VER" app-release.apk --repo rongyaozhixing/suangua --title "v$VER" --notes "$NOTE"
fi
rm -f app-release.apk

# 5. version.json → OSS + GitHub + Gitee（含 APK 国内直链 .bin）
echo "[5/6] 更新 version.json（OSS 检测源）+ 上传 APK 国内直链..."
cat > version.json <<EOF
{
  "versionCode": $NEWCODE,
  "versionName": "$VER",
  "apkUrl": "https://xiaoliuren-app.oss-cn-beijing.aliyuncs.com/app-release.bin",
  "ossApkUrl": "https://xiaoliuren-app.oss-cn-beijing.aliyuncs.com/app-release.bin",
  "githubApkUrl": "https://github.com/rongyaozhixing/suangua/releases/download/v$VER/app-release.apk",
  "note": "$NOTE"
}
EOF
python - <<'PYEOF'
import json, oss2, pathlib
cfg = json.loads(pathlib.Path.home().joinpath('.oss.json').read_text(encoding='utf-8'))
auth = oss2.Auth(cfg['access_key_id'], cfg['access_key_secret'])
bucket = oss2.Bucket(auth, cfg['endpoint'], cfg['bucket'])
with open('version.json', 'rb') as f:
    bucket.put_object('version.json', f, headers={'Content-Type': 'application/json'})
# APK 国内直链：OSS 禁 .apk 分发，改用 .bin 扩展名（App 下载后按 .apk 文件安装）
bucket.put_object_from_file('app-release.bin', 'C:/build/xiaoliuren/app/build/outputs/apk/release/app-release.apk',
                            headers={'Content-Type': 'application/octet-stream'})
print('      OSS version.json + app-release.bin 上传 OK')
PYEOF

# 6. 推送 + 桌面交付
echo "[6/6] 推送 + 桌面交付..."
git add -A
git commit -qm "v$VER $NOTE"
git push origin main 2>&1 | tail -1
git push gitee main 2>&1 | tail -1
cp "$APK" "C:/Users/lihaoda/Desktop/小六壬占-v$VER.apk"
rm -f C:/Users/lihaoda/Desktop/小六壬占-v*.apk 2>/dev/null || true
cp "$APK" "C:/Users/lihaoda/Desktop/小六壬占-v$VER.apk"
ls -la "C:/Users/lihaoda/Desktop/" | grep 小六壬

echo ""
echo "══════ 发布完成 v$VER（versionCode $NEWCODE）══════"
echo "手机端：打开 App 自动弹更新（不翻墙也能检测到，下载时 OSS 受限自动切 GitHub）"
