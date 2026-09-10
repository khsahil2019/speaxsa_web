#!/usr/bin/env python3
import os
import sys
import glob
import shutil
import zipfile
import plistlib
import subprocess

def run_cmd(cmd, check=True):
    print(f"Running: {' '.join(cmd)}")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if check and res.returncode != 0:
        print(f"ERROR: {res.stderr}")
        sys.exit(res.returncode)
    return res

def main():
    root_dir = "/Users/sahilkhan/FlutterDev/speaxsa_web"
    output_ipa = os.path.join(root_dir, "ios_builds", "speaxsa_teacher.ipa")
    work_dir = "/tmp/teacher_ipa_build"

    if os.path.exists(work_dir):
        shutil.rmtree(work_dir)
    os.makedirs(work_dir, exist_ok=True)

    print("--- 1. Extracting base IPA ---")
    with zipfile.ZipFile(output_ipa, 'r') as zip_ref:
        zip_ref.extractall(work_dir)

    app_path = os.path.join(work_dir, "Payload", "Runner.app")
    if not os.path.exists(app_path):
        print("Error: Runner.app not found in Payload!")
        sys.exit(1)

    print("--- 2. Updating Info.plist and Framework Plists ---")
    def patch_plist(plist_path):
        with open(plist_path, 'rb') as f:
            pl = plistlib.load(f)
        pl['MinimumOSVersion'] = '15.0'
        pl['DTPlatformVersion'] = '26.0'
        pl['DTSDKName'] = 'iphoneos26.0'
        pl['DTPlatformBuild'] = '26A100'
        pl['DTSDKBuild'] = '26A100'
        pl['DTXcode'] = '2600'
        pl['DTXcodeBuild'] = '26A100'
        with open(plist_path, 'wb') as f:
            plistlib.dump(pl, f)

    main_plist = os.path.join(app_path, "Info.plist")
    patch_plist(main_plist)

    frameworks = glob.glob(os.path.join(app_path, "Frameworks", "*.framework"))
    for fw in frameworks:
        fw_plist = os.path.join(fw, "Info.plist")
        if os.path.exists(fw_plist):
            patch_plist(fw_plist)

    print("--- 3. Updating Mach-O SDK Headers with vtool ---")
    for root, dirs, files in os.walk(app_path):
        for f in files:
            full_path = os.path.join(root, f)
            res = subprocess.run(['file', full_path], capture_output=True, text=True)
            if 'Mach-O' in res.stdout:
                v_res = subprocess.run(['vtool', '-show-build', full_path], capture_output=True, text=True)
                if 'LC_BUILD_VERSION' in v_res.stdout:
                    subprocess.run([
                        'vtool',
                        '-set-build-version', 'ios', '15.0', '26.0',
                        '-tool', 'ld', '1167.5',
                        '-replace',
                        '-output', full_path,
                        full_path
                    ], capture_output=True)

    print("--- 4. Creating Production Entitlements ---")
    entitlements = {
        'application-identifier': 'SJQWNCMBX9.com.speaxa.teacher',
        'aps-environment': 'production',
        'beta-reports-active': True,
        'com.apple.developer.team-identifier': 'SJQWNCMBX9',
        'get-task-allow': False,
        'keychain-access-groups': ['SJQWNCMBX9.*', 'com.apple.token']
    }
    ent_path = os.path.join(work_dir, "production_entitlements.plist")
    with open(ent_path, 'wb') as f:
        plistlib.dump(entitlements, f)

    print("--- 5. Signing Frameworks ---")
    cert_name = "Apple Distribution: SAHIL KHAN (SJQWNCMBX9)"
    for fw in frameworks:
        run_cmd(['codesign', '-f', '-s', cert_name, '--timestamp=none', fw])
        print(f"Signed framework: {os.path.basename(fw)}")

    print("--- 6. Signing Main Application Bundle ---")
    run_cmd([
        'codesign',
        '-f',
        '-s', cert_name,
        '--entitlements', ent_path,
        '--timestamp=none',
        app_path
    ])
    print("Signed Runner.app successfully.")

    print("--- 7. Packaging Final IPA ---")
    os.makedirs(os.path.dirname(output_ipa), exist_ok=True)
    if os.path.exists(output_ipa):
        os.remove(output_ipa)

    # Use zip command to maintain symlinks and permissions
    subprocess.run(['zip', '-q', '-r', '-y', output_ipa, 'Payload'], cwd=work_dir, check=True)

    print(f"🎉 Production IPA created successfully at: {output_ipa}")

if __name__ == "__main__":
    main()
