# People Count Module

This module is referenced from one of Azure Percept DK module, ImageCapturingModule. There are some purpose:
  * Receive the AI recognition result from `azureeyemodule`
  * Get camera streaming snapshot by ffmpeg
  * Upload snapshot to Azure storage account
  * Send notify event (with snapshot url) if the number of person is exceed setting
  * The module log is format for IoT edge rule, can get logs remotely at IoT Hub portal