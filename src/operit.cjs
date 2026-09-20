'use strict';
// Public Java bridge only. No private Operit class names or shell/root dependency.
function createOperitHost({ Java, Tools }) {
  if (!Java || !Tools?.UI) throw new Error('HOST_UNSUPPORTED');
  const context = Java.getApplicationContext();
  const prefs = context.getSharedPreferences('byteplus_douyin_control_v1', 0);
  const clock = Java.type('android.os.SystemClock');
  const process = Java.type('android.os.Process');
  const uuid = Java.type('java.util.UUID');
  const power = context.getSystemService('power');
  const keyguard = context.getSystemService('keyguard');
  const lockPath = context.getFilesDir().getAbsolutePath() + '/douyin-control.lock';
  return {
    now: () => Number(clock.elapsedRealtime()),
    processId: () => process.myPid() + ':' + process.getStartElapsedRealtime(),
    id: () => uuid.randomUUID().toString(),
    get: key => prefs.getString(key, null),
    set(key, value) { if (prefs.edit().putString(key, value).commit() !== true) throw new Error('STORAGE_FAILED'); },
    isInteractive: () => power.isInteractive() === true && keyguard.isKeyguardLocked() === false,
    acquire() {
      const file = Java.type('java.io.RandomAccessFile').newInstance(lockPath, 'rw');
      const channel = file.getChannel();
      let lock;
      try { lock = channel.tryLock(); }
      catch (error) {
        channel.close(); file.close();
        if (String(error).includes('OverlappingFileLockException')) return null;
        throw error;
      }
      if (lock === null) { channel.close(); file.close(); return null; }
      // No timeout-based lock stealing: a timed-out UI promise may still submit a touch.
      return () => { try { lock.release(); } finally { try { channel.close(); } finally { file.close(); } } };
    },
    readPage: () => Tools.UI.getPageInfo(),
    click: bounds => Tools.UI.clickElement({ bounds }),
    swipe: (...args) => Tools.UI.swipe(...args),
    sleep: ms => Tools.System.sleep(ms)
  };
}
module.exports = { createOperitHost };
