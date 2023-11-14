import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import type { Permission, PermissionStatus } from 'react-native-permissions';
import Permissions, { PERMISSIONS } from 'react-native-permissions';

type PermissionResults = Record<Permission, PermissionStatus>;
const nativePermissionGranted = (stats: PermissionResults, limitedCallback?: () => void) => {
  return Object.values(stats).every((result) => {
    if (result === 'granted') {
      return true;
    }
    if (result === 'limited') {
      limitedCallback?.();
      return true;
    }
    return false;
  });
};

//알림설정
export const CALL_PERMISSIONS_NOTI = Platform.select({
	android: [PERMISSIONS.ANDROID.POST_NOTIFICATIONS, PERMISSIONS.ANDROID.CAMERA, PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE],
	ios: [],
});

export const usePermissions = (perms: Permission[]) => {
  const [state, setState] = useState<'pending' | 'granted' | 'rejected'>('pending');
  useEffect(() => {
    const checkAndRequest = async () => {
      const checkResult = await Permissions.checkMultiple(perms);
      const alreadyGranted = nativePermissionGranted(checkResult);
      if (alreadyGranted) {
        return setState('granted');
      }

      const requestResult = await Permissions.requestMultiple(perms);
      const isGranted = nativePermissionGranted(requestResult);
      setState(isGranted ? 'granted' : 'rejected');
    };

    checkAndRequest();
  }, []);

  return state;
};