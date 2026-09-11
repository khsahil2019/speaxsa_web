#!/usr/bin/env python3
import os
import sys
import json
import glob
import shutil
import zipfile
import plistlib
import subprocess
import urllib.request

def get_token():
    if os.environ.get("GH_TOKEN"):
        return os.environ["GH_TOKEN"]
    try:
        with open(os.path.expanduser("~/.gh_token")) as f:
            return f.read().strip()
    except Exception:
        pass
    return ""

TOKEN = get_token()
REPO = "khsahil2019/speaxsa_web"
RUN_ID = sys.argv[1] if len(sys.argv) > 1 else "34589852905"
CERT_NAME = "Apple Distribution: SAHIL KHAN (SJQWNCMBX9)"
TEAM_ID = "SJQWNCMBX9"
BUNDLE_ID = "com.speaxa.teacher"

def run_cmd(cmd, check=True, cwd=None):
    print(f"Running: {' '.join(cmd)}")
    res = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd)
    if check and res.returncode != 0:
        print(f"ERROR: {res.stderr}")
        sys.exit(res.returncode)
    return res

def download_artifact(run_id, dest_zip_path):
    artifacts_url = f"https://api.github.com/repos/{REPO}/actions/runs/{run_id}/artifacts"
    req = urllib.request.Request(artifacts_url, headers={
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {TOKEN}"
    })
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    
    artifacts = data.get("artifacts", [])
    if not artifacts:
        print("No artifacts found!")
        sys.exit(1)
    
    artifact = artifacts[0]
    download_url = artifact["archive_download_url"]
    print(f"Downloading artifact {artifact['name']} from {download_url}...")
    
    dl_req = urllib.request.Request(download_url, headers={
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/vnd.github+json"
    })
    
    with urllib.request.urlopen(dl_req) as resp, open(dest_zip_path, "wb") as f:
        shutil.copyfileobj(resp, f)
    
    print(f"Saved artifact zip to {dest_zip_path} ({os.path.getsize(dest_zip_path)} bytes)")

def sign_archive(archive_path):
    app_path = os.path.join(archive_path, "Products", "Applications", "Runner.app")
    if not os.path.exists(app_path):
        print(f"Runner.app not found in archive at {app_path}")
        sys.exit(1)
    
    print(f"Signing archive at {archive_path}...")
    
    entitlements = {
        'application-identifier': f'{TEAM_ID}.{BUNDLE_ID}',
        'aps-environment': 'production',
        'beta-reports-active': True,
        'com.apple.developer.team-identifier': TEAM_ID,
        'get-task-allow': False,
        'keychain-access-groups': [f'{TEAM_ID}.*', 'com.apple.token']
    }
    
    ent_path = "/tmp/teacher_prod_entitlements.plist"
    with open(ent_path, 'wb') as f:
        plistlib.dump(entitlements, f)
    
    # 1. Sign all bundles
    for root, dirs, files in os.walk(app_path):
        for d in dirs:
            if d.endswith(".bundle"):
                bundle_path = os.path.join(root, d)
                run_cmd(['codesign', '-f', '-s', CERT_NAME, '--timestamp=none', bundle_path])
                print(f"Signed bundle: {d}")

    # 2. Sign all frameworks
    frameworks = glob.glob(os.path.join(app_path, "Frameworks", "*.framework"))
    for fw in frameworks:
        run_cmd(['codesign', '-f', '-s', CERT_NAME, '--timestamp=none', fw])
        print(f"Signed framework: {os.path.basename(fw)}")

    # 3. Sign main app
    run_cmd([
        'codesign',
        '-f',
        '-s', CERT_NAME,
        '--entitlements', ent_path,
        '--timestamp=none',
        app_path
    ])
    print("Runner.app codesigned successfully!")

def main():
    dest_zip = "/tmp/speaxa_teacher_gm_artifact.zip"
    unzip_dir = "/tmp/teacher_gm_extracted"
    
    if os.path.exists(unzip_dir):
        shutil.rmtree(unzip_dir)
    os.makedirs(unzip_dir, exist_ok=True)
    
    download_artifact(RUN_ID, dest_zip)
    
    print(f"Unzipping artifact...")
    with zipfile.ZipFile(dest_zip, 'r') as zip_ref:
        zip_ref.extractall(unzip_dir)
        
    # The artifact itself was zipped as speaxa-teacher-official-gm.xcarchive.zip inside the github artifact
    inner_zip = os.path.join(unzip_dir, "speaxa-teacher-official-gm.xcarchive.zip")
    if os.path.exists(inner_zip):
        print("Extracting inner xcarchive zip...")
        with zipfile.ZipFile(inner_zip, 'r') as zip_ref:
            zip_ref.extractall(unzip_dir)
            
    xcarchive_path = os.path.join(unzip_dir, "Runner.xcarchive")
    if not os.path.exists(xcarchive_path):
        print(f"Error: Runner.xcarchive not found in {unzip_dir}")
        sys.exit(1)
        
    sign_archive(xcarchive_path)
    
    # Copy to Xcode Archives directory
    dest_archive_dir = os.path.expanduser("~/Library/Developer/Xcode/Archives/2026-09-11")
    os.makedirs(dest_archive_dir, exist_ok=True)
    final_archive = os.path.join(dest_archive_dir, "Speaxa_Teacher_Official_GM.xcarchive")
    if os.path.exists(final_archive):
        shutil.rmtree(final_archive)
        
    shutil.copytree(xcarchive_path, final_archive)
    print(f"✅ Official GM Archive placed at: {final_archive}")
    
    # Open in Xcode Organizer
    run_cmd(['open', '-a', 'Xcode', final_archive])
    print("🚀 Opened Xcode Organizer with the Official GM Archive!")

if __name__ == "__main__":
    main()
