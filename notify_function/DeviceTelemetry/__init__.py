import logging
import requests
import os
import json
import base64

import azure.functions as func


def main(event: func.EventGridEvent):
    try:
        teams_webhook_url = os.environ['TEAMS_WEBHOOK_URL']

        event_json = event.get_json()
        device_id = event_json['systemProperties']['iothub-connection-device-id']
        logging.info('device_id: {}'.format(device_id))
        data_encode = event_json['body']
        data = base64.b64decode(data_encode)
        data_dict = json.loads(data)
        logging.info(data_dict)

        count, url, timestamp = data_dict['count'], data_dict['url'], int(
            data_dict['timestamp']) // 1e9

        # https://docs.microsoft.com/en-us/outlook/actionable-messages/message-card-reference
        message_card = {
            '@type': 'MessageCard',
            '@context': 'http://schema.org/extensions',
            'summary': 'Percept People Detection',
            'title': '[{}]'.format(device_id),
            'text': '{} people detected![Image]({})'.format(count, url),
            'themeColor': '19b5fe',
            'potentialAction': [
                {
                    '@type': 'OpenUri',
                    'name': 'Download',
                    'targets': [
                        {
                            'os': 'default',
                            'uri': url
                        }
                    ]
                }
            ]
        }
        response = requests.post(teams_webhook_url, json=message_card)
        response_content = response.content.decode("utf-8")
        logging.info(response_content)
    except Exception as e:
        logging.error('Failed: ' + str(e))
