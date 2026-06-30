const fs = require('fs');
const path = require('path');

const targetFile = path.join(
  __dirname,
  '../node_modules/react-native/ReactCommon/react/renderer/core/graphicsConversions.h'
);

try {
  if (fs.existsSync(targetFile)) {
    let content = fs.readFileSync(targetFile, 'utf8');
    const targetString = 'return std::format("{}%", dimension.value);';
    const replacementString = 'return std::to_string(dimension.value) + "%";';

    if (content.includes(targetString)) {
      content = content.replace(targetString, replacementString);
      fs.writeFileSync(targetFile, content, 'utf8');
      console.log('✅ [Hagu Mobile] Successfully patched react-native graphicsConversions.h!');
    } else if (content.includes(replacementString)) {
      console.log('✅ [Hagu Mobile] react-native graphicsConversions.h is already patched.');
    } else {
      console.warn('⚠️ [Hagu Mobile] Target string not found in graphicsConversions.h. React Native version might have changed?');
    }
  } else {
    console.warn('⚠️ [Hagu Mobile] graphicsConversions.h not found. Skipped patching.');
  }
} catch (error) {
  console.error('❌ [Hagu Mobile] Failed to patch react-native:', error);
}
