type TimeLabelData = { key: string; label: string; time: number };

type FormattedTime = {
    value: number;
    unit?: "ms" | "s" | "min" | "hrs";
    str?: `${FormattedTime["value"]}${Exclude<FormattedTime["unit"], undefined>}`;
};

type TimeCallback = (time_format: FormattedTime, start_time: number) => any;

class Timer {
    private _data: Record<string, TimeLabelData> = {};

    constructor() {}

    private findLabel(label: string): TimeLabelData | undefined {
        // return Object.values(this._data).find(d => d.label == label);
        return this._data[label] ?? undefined;
    }

    private timeDiff(timestamp: number | undefined) {
        if (typeof timestamp === "undefined") return 0;
        return this.now() - timestamp;
    }

    private logTime(d: TimeLabelData | undefined) {
        if (!d) return;
        const { label, key, time: _time } = d;
        const time = this.formatTime(this.timeDiff(_time));
        console.log(label, `in ${time.str}`);
        delete this._data[key];
    }

    now() {
        return Date.now();
    }

    time(label: string) {
        const key = label;
        this._data[key] = { key, label, time: this.now() };
    }

    timeEnd(label: string) {
        this.logTime(this.findLabel(label));
    }

    timeCallback(label: string) {
        const d = this.findLabel(label);
        return (time_cb: TimeCallback) => {
            if (!d) return;
            time_cb(this.formatTime(this.timeDiff(d.time)), d.time);
            delete this._data[d.key];
        };
    }

    timeLogCallback(label: string) {
        return (time_cb: TimeCallback) =>
            this.timeCallback(label)((...args) => {
                const v = time_cb(...args);
                console.log(...(Array.isArray(v) ? v : [v]));
            });
    }

    getTime(label: string) {
        const d = this.findLabel(label);
        const time = this.timeDiff(d?.time);
        return { label: d, ms: time, format: this.formatTime(time) };
    }

    formatTime(ms: number | undefined): FormattedTime {
        ms = ms ?? 0;
        let f: FormattedTime = { value: ms, unit: "ms" };
        if (ms > 1000) {
            const s = ms / 1000;
            if (s > 60) {
                const m = s / 60;
                if (m > 60) {
                    const h = m / 60;
                    f = { value: h, unit: "hrs" };
                }
                f = { value: m, unit: "min" };
            }
            f = { value: s, unit: "s" };
        }
        return {
            ...f,
            str: f.unit ? `${f.value}${f.unit}` : undefined,
        };
    }
}

const timer = new Timer();

export { timer };
