/** @format */

import { InternalServerErrorException } from '@nestjs/common';
import { credential, initializeApp } from 'firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';
import certificate from './cert.json';

class FirebaseService {
  constructor() {
    initializeApp({ credential: credential.cert(certificate) });
  }

  static async pushToDevice(message: string, deviceToken: string) {
    const data = await getMessaging()
      .send({ data: { message }, token: deviceToken })
      .catch((e) => {
        throw new InternalServerErrorException(
          e?.message || 'Error sending push notification',
        );
      });

    return data;
  }

  static async pushToTopic(message: string, topic: string) {
    const data = await getMessaging()
      .send({ data: { message }, topic })
      .catch((e) => {
        throw new InternalServerErrorException(
          e?.message || 'Error sending push notifications',
        );
      });

    return data;
  }

  static async pushToDevices(message: string, deviceTokens: string[]) {
    const data = await getMessaging()
      .sendEachForMulticast({ data: { message }, tokens: deviceTokens })
      .catch((e) => {
        throw new InternalServerErrorException(
          e?.message || 'Error sending push notifications',
        );
      });

    return data;
  }
}

export default FirebaseService;
