module.exports = {
    //Recommended logging format for iotedge module
    //https://github.com/Azure/iotedge/blob/master/doc/built-in-logs-pull.md
    info: function (messageText) {
        const logLevel = 6;
        const date = new Date();
        const timeStamp = module.exports.formatTimeStamp(date);
        console.log(`<${logLevel}> ${timeStamp} ${messageText}`);
    },

    error: function (messageText) {
        messageText = messageText.replace(/\s+/g, ' ').trim();
        const logLevel = 3;
        const date = new Date();
        const timeStamp = module.exports.formatTimeStamp(date);
        console.error(`<${logLevel}> ${timeStamp} ${messageText}`);
    },

    formatMessage: function (messageText) {
        return messageText.toString().trim();
    },

    //{timeStamp} should be formatted as yyyy-mm-dd hh:mm:ss.fff zzz
    formatTimeStamp: function (date) {
        const yyyy = date.getFullYear();
        const mm = module.exports.pad(date.getMonth() + 1, 2);
        const dd = module.exports.pad(date.getDate(), 2);
        const hh = module.exports.pad(date.getHours(), 2);
        const min = module.exports.pad(date.getMinutes(), 2);
        const ss = module.exports.pad(date.getSeconds(), 2);
        const fff = module.exports.pad(date.getMilliseconds(), 3);
        const zzz = module.exports.zzz_offset(date);

        const timeStamp = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}.${fff} ${zzz}`;
        return timeStamp;
    },

    //zzz_offset
    //https://docs.microsoft.com/en-us/dotnet/standard/base-types/custom-date-and-time-format-strings#zzzSpecifier
    zzz_offset: function (date) {
        const hours = parseInt(date.getTimezoneOffset() / 60);
        const minutes = date.getTimezoneOffset() - (60 * hours);
        let hoursAndMinutes = module.exports.pad(Math.abs(hours), 2) + ':' + module.exports.pad(Math.abs(minutes), 2);

        hoursAndMinutes = (hours < 0) ? ('-' + hoursAndMinutes) : ('+' + hoursAndMinutes);
        return hoursAndMinutes;
    },

    pad: function (number, digits) {
        if ((number = number + '').length < digits) {
            return new Array((++digits) - number.length).join('0') + number;
        }
        return number;
    }
};