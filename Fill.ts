//Fill类，负责信息整理
type RequestMethod = "GET" | "POST" | "POSTJSON" | "DOWNLOAD";

type OnError = (code: number) => void;
type OnLoad = (data: Response | string) => void;
type OnProgress = (event: Event) => void;
type OnVoid = () => void;
type OnFillError = (error: Error) => void;
type AsFunc = (source: string) => any;

type MetaData = {
    url ? : string,
    method ? : RequestMethod,
    headers ? : Headers,
    data ? : FormData,
    listeners ? : {
        as ? : Array < AsFunc > ,
        onError ? : OnError,
        onLoad ? : OnLoad,
        onProgress ? : OnProgress,
        onTimeout ? : OnVoid,
        onFillError ? : OnFillError;
        //暂未实现
        // onStart?: OnProgress,
        // onFinish?: OnProgress,
        // onAbort?: OnProgress
    }
    settings ? : {
        timeout ? : number,
        mimeType ? : string
    }
};

// class FillResponse {

//     private text: string;
//     private status: number;

//     constructor(text: string, status: number) {
//         this.text = text;
//         this.status = status;
//     }

//     private getText(): string {
//         return this.text;
//     }

//     private getJson(): object {
//         return JSON.parse(this.text);
//     }

//     private getStatus(): number {
//         return this.status;
//     }
// }


export default class Fill {

    private metaData: MetaData = {}
    public constructor(url: string, method: RequestMethod) {
        this.metaData.method = method;
        this.metaData.data = new FormData();
        this.metaData.headers = new Headers();
        this.metaData.listeners = { as: [] };
        this.metaData.settings = {};
        this.metaData.url = url;
    }

    //请求方法，并生成Fill实例
    public static get(url: string): Fill {
        return new Fill(url, "GET");
    }

    public static post(url: string): Fill {
        return new Fill(url, "POST");
    }

    public static postJson(url: string): Fill {
        return new Fill(url, "POSTJSON");
    }

    //元数据设置
    //设置参数
    public add(name: string, value: string): Fill {
        this.metaData.data.append(name, value);
        return this;
    }

    public addParam = this.add;

    public addParams(values: {
        [propName: string]: string }): Fill {
        Object.keys(values).forEach((value: string) => this.add(value, values[value]));
        return this;
    }

    //只有post方法可以添加文件
    public addFile(name: string, file: File | Blob): Fill {
        if (this.metaData.method != "POST") return;
        this.metaData.data.append(name, file);
        return this;
    }

    //设置header
    public addHeader(name: string, value: string): Fill {
        this.metaData.headers.append(name, value);
        return this;
    }

    //设置超时时间
    public timeout(time: number): Fill {
        this.metaData.settings.timeout = time;
        return this;
    }

    //设置MimeType
    public overrideMimeType(mt: string): Fill {
        this.metaData.settings.mimeType = mt;
        return this;
    }

    //设置回调方法
    public onLoad(func: OnLoad): Fill {
        this.metaData.listeners.onLoad = func;
        return this;
    }

    public onError(func: OnError): Fill {
        this.metaData.listeners.onError = func;
        return this;
    }

    public onFillError(func: OnFillError): Fill {
        this.metaData.listeners.onFillError = func;
        return this;
    }

    public onProgress(func: OnProgress): Fill {
        this.metaData.listeners.onProgress = func;
        return this;
    }

    public onTimeout(func: OnVoid): Fill {
        if (!this.metaData.settings.timeout) {
            this.metaData.settings.timeout = 1000;
        }
        this.metaData.listeners.onTimeout = func;
        return this;
    }

    public as(func: AsFunc): Fill {
        this.metaData.listeners.as.push(func);
        return this;
    }

    //将元数据转换为请求
    public request(): XMLHttpRequest {
        try {
            return FillRequest.request(this.metaData);
        } catch (error) {
            this.metaData.listeners.onFillError ?.(error);
        }

    }

}


class FillRequest {

    //返回已经open但没send的xhr
    static request(metaData: MetaData): XMLHttpRequest {
        let url: string, data: string | FormData;
        //根据不同method，获取不同类型值
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
        //开始构造xhr
        const xhr = new XMLHttpRequest();
        xhr.open(metaData.method, url, true);
        //设置请求头
        metaData.headers.forEach((value, key) => xhr.setRequestHeader(key, value))
            //设置元信息
        if (metaData.settings.timeout) xhr.timeout = metaData.settings.timeout;
        if (metaData.settings.mimeType) xhr.overrideMimeType(metaData.settings.mimeType);
        //设置监听
        if (metaData.listeners.onTimeout) xhr.ontimeout = metaData.listeners.onTimeout;
        if(metaData.listeners.onProgress) xhr.onprogress = metaData.listeners.onProgress;
        xhr.onload = (ev) => {
                let status = xhr.status;
                if ((status >= 200 && status <= 300) || status == 304) {
                    //请求成功
                    //执行as方法
                    let result: Response | string = xhr.response;
                    if (metaData.listeners.as && metaData.listeners.as.length != 0) {
                        let lastReturn = xhr.responseText;
                        metaData.listeners.as.forEach(
                            (value) => {
                                lastReturn = value(lastReturn);
                            }
                        );
                        result = lastReturn ? lastReturn : result;
                    }
                    metaData.listeners.onLoad ?.(result);
                    return;
                }
                metaData.listeners.onError ?.(status);
            }
            //根据不同method，请求
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

    private static GetDataParsed(url: string, data: FormData): string {
        //遍历formdata然后组成字符串
        let paramString = "?";
        data.forEach((value, key) => paramString += `${encodeURIComponent(key)}=${encodeURIComponent(value.toString())}`);
        return url + paramString;
    }

    private static JsonDataParsed(data: FormData): string {
        let objData: {
            [propName: string]: string } = {};
        data.forEach((value, key) => objData[key] = value.toString());
        return JSON.stringify(objData);
    }

}
