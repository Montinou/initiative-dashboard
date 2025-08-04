// Script to clear CEO area assignment and cached profile
// Run this in the browser console to force a profile refresh

// Clear the cached profile
localStorage.removeItem('user_profile_v2');

// Clear any other cached auth data
localStorage.removeItem('sb-zkkdnslupqnpioltjpeu-auth-token');

console.log('✅ Cached profile cleared');
console.log('🔄 Please refresh the page to reload your profile');
console.log('📝 The CEO profile has been updated in the database to have no area_id restriction');