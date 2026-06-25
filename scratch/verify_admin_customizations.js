const base = "http://localhost:5002/api";

async function verify() {
  console.log("=== Verification of Admin Configuration and Dynamic Rewards Settings ===");
  try {
    // 1. Admin Login
    console.log("Logging in as Admin...");
    const adminLoginRes = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@speaxa.com', password: '123456' })
    });
    if (!adminLoginRes.ok) throw new Error("Admin login failed");
    const adminData = await adminLoginRes.json();
    const adminToken = adminData.token;
    console.log("Admin logged in successfully.");

    // 2. Fetch and Backup original settings
    console.log("Fetching original settings...");
    const origSettingsRes = await fetch(`${base}/admin/settings`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (!origSettingsRes.ok) throw new Error("Failed to fetch original settings");
    const origSettings = await origSettingsRes.json();

    // 3. Test changing referral and reward settings
    console.log("Modifying settings dynamically...");
    const testSettings = {
      student_referral_bonus_pct: "12.50",
      teacher_referral_bonus_pct: "3.25",
      teacher_referral_max_cap: "15",
      default_teacher_share_pct: "60.00",
      referral_teacher_share_pct: "45.00"
    };

    const updateSettingsRes = await fetch(`${base}/admin/settings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testSettings)
    });
    if (!updateSettingsRes.ok) throw new Error("Failed to update settings");
    console.log("Settings updated successfully. Verifying...");

    // Fetch again to verify changes
    const verifySettingsRes = await fetch(`${base}/admin/settings`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const updatedSettings = await verifySettingsRes.json();
    for (const key of Object.keys(testSettings)) {
      if (parseFloat(updatedSettings[key]) !== parseFloat(testSettings[key])) {
        throw new Error(`Setting verification failed for key: ${key}. Expected ${testSettings[key]}, got ${updatedSettings[key]}`);
      }
    }
    console.log("Global Settings verified successfully!");

    // 4. Test Performance Slabs Config CRUD
    console.log("Creating new performance slab config...");
    const tempSlab = {
      id: "slab_temp_test",
      slab_name: "Temp Test Slab",
      target_revenue: 9999.00,
      reward_amount: 888.00,
      reward_item: "Test Gift Item",
      grooming_group: "Foundation Group"
    };

    const createSlabRes = await fetch(`${base}/admin/config/slabs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tempSlab)
    });
    if (!createSlabRes.ok) throw new Error("Failed to create temporary slab configuration");
    console.log("Slab created. Verifying list...");

    // List and find the created slab
    let slabsRes = await fetch(`${base}/admin/config/slabs`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    let slabs = await slabsRes.json();
    let foundSlab = slabs.find(s => s.id === tempSlab.id);
    if (!foundSlab || foundSlab.slab_name !== tempSlab.slab_name) {
      throw new Error("Temporary slab not found or mismatched in list!");
    }
    console.log("Slab found in config. Updating slab...");

    // Edit slab config
    const editedSlab = {
      slab_name: "Temp Test Slab Edited",
      target_revenue: 12345.00,
      reward_amount: 999.00,
      reward_item: "Test Gift Item Edited",
      grooming_group: "Foundation Group"
    };

    const updateSlabRes = await fetch(`${base}/admin/config/slabs/${tempSlab.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(editedSlab)
    });
    if (!updateSlabRes.ok) throw new Error("Failed to update temporary slab configuration");

    // Fetch and check edited values
    slabsRes = await fetch(`${base}/admin/config/slabs`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    slabs = await slabsRes.json();
    foundSlab = slabs.find(s => s.id === tempSlab.id);
    if (!foundSlab || foundSlab.slab_name !== editedSlab.slab_name || parseFloat(foundSlab.target_revenue) !== editedSlab.target_revenue) {
      throw new Error("Temporary slab update verification failed!");
    }
    console.log("Slab update verified. Deleting slab...");

    // Delete slab
    const deleteSlabRes = await fetch(`${base}/admin/config/slabs/${tempSlab.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (!deleteSlabRes.ok) throw new Error("Failed to delete temporary slab configuration");

    slabsRes = await fetch(`${base}/admin/config/slabs`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    slabs = await slabsRes.json();
    if (slabs.some(s => s.id === tempSlab.id)) {
      throw new Error("Temporary slab still exists after delete!");
    }
    console.log("Slab deletion verified successfully!");

    // 5. Test Grooming Allowance Groups CRUD
    console.log("Creating new grooming allowance group...");
    const tempGroup = {
      group_name: "Temp Test Group",
      allowance_amount: 777.00,
      description: "Temp test description"
    };

    const createGroupRes = await fetch(`${base}/admin/config/allowances`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tempGroup)
    });
    if (!createGroupRes.ok) throw new Error("Failed to create temporary grooming group");
    console.log("Allowance group created. Verifying list...");

    // List and verify
    let groupsRes = await fetch(`${base}/admin/config/allowances`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    let groups = await groupsRes.json();
    let foundGroup = groups.find(g => g.group_name === tempGroup.group_name);
    if (!foundGroup || parseFloat(foundGroup.allowance_amount) !== tempGroup.allowance_amount) {
      throw new Error("Grooming group not found or mismatched allowance amount!");
    }
    console.log("Grooming group verification passed. Deleting group...");

    // Delete grooming group
    const deleteGroupRes = await fetch(`${base}/admin/config/allowances/${encodeURIComponent(tempGroup.group_name)}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (!deleteGroupRes.ok) throw new Error("Failed to delete temporary grooming group");

    groupsRes = await fetch(`${base}/admin/config/allowances`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    groups = await groupsRes.json();
    if (groups.some(g => g.group_name === tempGroup.group_name)) {
      throw new Error("Grooming group still exists after delete!");
    }
    console.log("Grooming group deletion verified successfully!");

    // 6. Restore original settings
    console.log("Restoring original global settings...");
    const restoreSettings = {
      student_referral_bonus_pct: origSettings.student_referral_bonus_pct || "5.00",
      teacher_referral_bonus_pct: origSettings.teacher_referral_bonus_pct || "1.00",
      teacher_referral_max_cap: origSettings.teacher_referral_max_cap || "10",
      default_teacher_share_pct: origSettings.default_teacher_share_pct || "50.00",
      referral_teacher_share_pct: origSettings.referral_teacher_share_pct || "50.00"
    };
    const restoreRes = await fetch(`${base}/admin/settings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(restoreSettings)
    });
    if (!restoreRes.ok) throw new Error("Failed to restore original settings");

    console.log("\n=== ALL REWARDS AND REFERRAL CRUD TESTS PASSED SUCCESSFULLY! ===");

  } catch (err) {
    console.error("Verification failed:", err);
    process.exit(1);
  }
}

verify();
