#!/usr/bin/env python3
import os
import sys
import glob
import shutil
import zipfile
import plistlib
import subprocess

def run_cmd(cmd, check=True, cwd=None):
    print(f"Running: {' '.join(cmd)}")
    res = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd)
    if check and res.returncode != 0:
        print(f"ERROR: {res.stderr}")
        sys.exit(res.returncode)
    return res

def main():
    root_dir = "/Users/sahilkhan/FlutterDev/speaxsa_web"
    app_source = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root_dir, "downloaded_app", "Runner.app")
    output_ipa = os.path.join(root_dir, "ios_builds", "speaxsa_teacher.ipa")
    work_dir = "/tmp/teacher_gm_signing"

    if not os.path.exists(app_source):
        print(f"Error: Compiled app not found at '{app_source}'")
        print("Usage: python3 scripts/sign_and_package_gm_build.py /path/to/Runner.app")
        sys.exit(1)

    if os.path.exists(work_dir):
        shutil.rmtree(work_dir)
    os.makedirs(os.path.join(work_dir, "Payload"), exist_ok=True)

    dest_app = os.path.join(work_dir, "Payload", "Runner.app")
    print(f"Copying '{app_source}' to '{dest_app}'...")
    shutil.copytree(app_source, dest_app, symlinks=True)

    # Entitlements
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

    cert_name = "Apple Distribution: SAHIL KHAN (SJQWNCMBX9)"

    # Sign all bundles
    for root, dirs, files in os.walk(dest_app):
        for d in dirs:
            if d.endswith(".bundle"):
                bundle_path = os.path.join(root, d)
                run_cmd(['codesign', '-f', '-s', cert_name, '--timestamp=none', bundle_path])
                print(f"Signed bundle: {d}")

    # Sign all frameworks
    frameworks = glob.glob(os.path.join(dest_app, "Frameworks", "*.framework"))
    for fw in frameworks:
        run_cmd(['codesign', '-f', '-s', cert_name, '--timestamp=none', fw])
        print(f"Signed framework: {os.path.basename(fw)}")

    # Sign main app
    run_cmd([
        'codesign',
        '-f',
        '-s', cert_name,
        '--entitlements', ent_path,
        '--timestamp=none',
        dest_app
    ])
    print("Signed Runner.app successfully.")

    # Package IPA
    os.makedirs(os.path.dirname(output_ipa), exist_ok=True)
    if os.path.exists(output_ipa):
        os.remove(output_ipa)

    run_cmd(['zip', '-q', '-r', '-y', output_ipa, 'Payload'], cwd=work_dir)
    print(f"🎉 Production GM IPA created successfully at: {output_ipa}")

if __name__ == "__main__":
    main()
