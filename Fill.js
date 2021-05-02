define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Fill {
        constructor(url, method) {
            this.metaData = {};
            this.addParam = this.add;
            this.metaData.method = method;
            this.metaData.data = new FormData();
            this.metaData.headers = new Headers();
            this.metaData.listeners = { as: [] };
            this.metaData.settings = {};
            this.metaData.url = url;
        }
        static get(url) {
            return new Fill(url, "GET");
        }
        static post(url) {
            return new Fill(url, "POST");
        }
        static postJson(url) {
            return new Fill(url, "POSTJSON");
        }
        add(name, value) {
            this.metaData.data.append(name, value);
            return this;
        }
        addParams(values) {
            Object.keys(values).forEach((value) => this.add(value, values[value]));
            return this;
        }
        addFile(name, file) {
            if (this.metaData.method != "POST")
                return;
            this.metaData.data.append(name, file);
            return this;
        }
        addHeader(name, value) {
            this.metaData.headers.append(name, value);
            return this;
        }
        timeout(time) {
            this.metaData.settings.timeout = time;
            return this;
        }
        overrideMimeType(mt) {
            this.metaData.settings.mimeType = mt;
            return this;
        }
        onLoad(func) {
            this.metaData.listeners.onLoad = func;
            return this;
        }
        onError(func) {
            this.metaData.listeners.onError = func;
            return this;
        }
        onFillError(func) {
            this.metaData.listeners.onFillError = func;
            return this;
        }
        onProgress(func) {
            this.metaData.listeners.onProgress = func;
            return this;
        }
        onTimeout(func) {
            if (!this.metaData.settings.timeout) {
                this.metaData.settings.timeout = 1000;
            }
            this.metaData.listeners.onTimeout = func;
            return this;
        }
        as(func) {
            this.metaData.listeners.as.push(func);
            return this;
        }
        request() {
            var _a, _b;
            try {
                return FillRequest.request(this.metaData);
            }
            catch (error) {
                (_b = (_a = this.metaData.listeners).onFillError) === null || _b === void 0 ? void 0 : _b.call(_a, error);
            }
        }
    }
    exports.default = Fill;
    class FillRequest {
        static request(metaData) {
            let url, data;
            switch (metaData.method) {
                case "GET":
                    url = this.GetDataParsed(metaData.url, metaData.data);
                    data = metaData.data;
                    break;
                case "POST":
                    url = metaData.url;
                    data = metaData.data;
                    break;
                case "POSTJSON":
                    url = metaData.url;
                    data = this.JsonDataParsed(metaData.data);
                    break;
                default:
                    break;
            }
            const xhr = new XMLHttpRequest();
            xhr.open(metaData.method, url, true);
            metaData.headers.forEach((value, key) => xhr.setRequestHeader(key, value));
            if (metaData.settings.timeout)
                xhr.timeout = metaData.settings.timeout;
            if (metaData.settings.mimeType)
                xhr.overrideMimeType(metaData.settings.mimeType);
            if (metaData.listeners.onTimeout)
                xhr.ontimeout = metaData.listeners.onTimeout;
            if (metaData.listeners.onProgress)
                xhr.onprogress = metaData.listeners.onProgress;
            xhr.onload = (ev) => {
                var _a, _b, _c, _d;
                let status = xhr.status;
                if ((status >= 200 && status <= 300) || status == 304) {
                    let result = xhr.response;
                    if (metaData.listeners.as && metaData.listeners.as.length != 0) {
                        let lastReturn = xhr.responseText;
                        metaData.listeners.as.forEach((value) => {
                            lastReturn = value(lastReturn);
                        });
                        result = lastReturn ? lastReturn : result;
                    }
                    (_b = (_a = metaData.listeners).onLoad) === null || _b === void 0 ? void 0 : _b.call(_a, result);
                    return;
                }
                (_d = (_c = metaData.listeners).onError) === null || _d === void 0 ? void 0 : _d.call(_c, status);
            };
            switch (metaData.method) {
                case "GET":
                    xhr.send(null);
                    break;
                case "POST":
                    xhr.send(data);
                    break;
                case "POSTJSON":
                    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                    xhr.send(data);
                    break;
                default:
                    break;
            }
            return xhr;
        }
        static GetDataParsed(url, data) {
            let paramString = "?";
            data.forEach((value, key) => paramString += `${encodeURIComponent(key)}=${encodeURIComponent(value.toString())}`);
            return url + paramString;
        }
        static JsonDataParsed(data) {
            let objData = {};
            data.forEach((value, key) => objData[key] = value.toString());
            return JSON.stringify(objData);
        }
    }
});
//# sourceMappingURL=Fill.js.map
