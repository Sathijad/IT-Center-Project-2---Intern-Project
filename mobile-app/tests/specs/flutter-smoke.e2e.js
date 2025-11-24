const { byValueKey } = require('appium-flutter-finder');

async function waitForKey(key, timeout = 10000) {
  const finder = byValueKey(key);
  try {
    await browser.execute('flutter:waitFor', { finder, timeout });
    return true;
  } catch {
    return false;
  }
}

async function tapKey(key) {
  const finder = byValueKey(key);
  await browser.execute('flutter:tap', finder);
}

describe('IT Center Flutter Smoke Test', () => {
  it('detects login or home screen', async () => {
    // Give Flutter time to expose the VM service
    await browser.pause(5000);

    const onLogin = await waitForKey('sign_in_button', 8000);
    const onHome = !onLogin
      ? await waitForKey('dashboard_welcome_card', 8000)
      : false;

    if (onLogin) {
      console.log('✓ Login screen detected');
      await tapKey('sign_in_button');
      console.log('⬆️  Sign-in flow triggered (Hosted UI appears in WebView).');
    } else if (onHome) {
      console.log('✓ Home screen detected');
    } else {
      throw new Error(
        'Neither login nor home widgets were found. Ensure the app is built with ValueKeys.'
      );
    }
  });
});

