
import * as io from 'socket.io-client';
interface BuzzConfig{
    targetUrl: string
}

class Buzz {
    private conn?:WebSocket;
    private subscribeHandlers:any
    private presenceHandlers:any
    private config:BuzzConfig
    constructor(config:BuzzConfig) {
        this.subscribeHandlers = {}
        this.presenceHandlers = {}
        if(!config){
            config = {
                targetUrl:''
            }
        }
        config.targetUrl = config.targetUrl ? config.targetUrl : 'wss://buzz.bobby-demo.site';
        this.config = config;
        setInterval(() => {
            this.reconnect()
        }, 10000)
        setInterval(async () => {
            await this.wait()
            await this.pulseSubscribe()
        }, 60 * 1 * 1000)
        this.reconnect()
        window.addEventListener('beforeunload', (event) => {
            // Cancel the event as stated by the standard.
            event.preventDefault();
            // Chrome requires returnValue to be set.
            event.returnValue = '';
            this.conn!.close(1000)
          });
    }
    pulseSubscribe = async() =>{
        await this.wait()
        for( const key in this.subscribeHandlers){
            this.conn!.send(JSON.stringify({
                type: "subscribe",
                target: {
                    channel: this.subscribeHandlers[key][0].channel,
                    topic: this.subscribeHandlers[key][0].topic,
                }
            }))
        }
    }
    close = async() =>{
        this.conn!.close(1000)
    }
    
    reconnect = async () => {
        if (this.conn == undefined || this.conn.readyState == 3) {
            this.conn = new WebSocket(`${this.config.targetUrl}/ws`);
            this.conn.onopen = (evt:Event):any => {
                console.log('connected')
                this.pulseSubscribe()
                return
            }
            this.conn!.onclose = (evt:Event) => {
                console.log("CLOSE")
                console.log(evt)
            };
            this.conn!.onmessage = (evt:MessageEvent) => {
                var message = JSON.parse(evt.data);
                if (message.type == "presence") {
                    var handlers = this.presenceHandlers[message.target.channel + message.target.topic];
                    var payload = JSON.parse(message.payload);
                    if(payload){
                        handlers.forEach((e:any) => {
                            e.callback(payload.map(((x:any) => JSON.parse(x))))
                        });
                    }
                   
                } else {
                    var handlers = this.subscribeHandlers[message.target.channel + message.target.topic];
                    var payload = JSON.parse(message.payload);
                    handlers.forEach((e:any) => {
                        e.callback(payload)
                    });
                }
            }

        };
    }
    wait = async () => {
        while (this.conn == undefined || this.conn!.readyState != 1) {
            await new Promise((resolve) => {
                setTimeout(() => {
                    resolve()
                }, 5000)
            })
        }
    }
    subscribe = async (channel:string, topic:string, callback:any) => {
        await this.wait()
        if (this.subscribeHandlers[channel + topic]) {
            this.subscribeHandlers[channel + topic].push({ topic, channel, callback })
        } else {
            this.subscribeHandlers[channel + topic] = [{ topic, channel, callback }]
        }
        this.conn!.send(JSON.stringify({
            type: "subscribe",
            target: {
                channel: channel,
                topic: topic,
            }
        }))
    }
    presenceSubscribe = async (channel:string, topic:string, callback:any) => {
        if (this.presenceHandlers[channel + topic]) {
            this.presenceHandlers[channel + topic].push({ callback })
        } else {
            this.presenceHandlers[channel + topic] = [{ callback }]
        }
        await this.wait()
        setInterval(async () => {
            await this.wait()
            this.conn!.send(JSON.stringify({
                type: "presence",
                target: {
                    channel: channel,
                    topic: topic,
                }
            }))
        }, 2000)
        this.conn!.send(JSON.stringify({
            type: "presence",
            target: {
                channel: channel,
                topic: topic,
            }
        }))
    }
    presenceWithState= async (channel:string, topic:string, key:string, callback:any) => {
        setInterval(async () => {
            await this.wait()
            this.conn!.send(JSON.stringify({
                type: "heartbeat",
                target: {
                    channel: channel,
                    topic: topic,
                },
                key,
                payload: JSON.stringify(await callback())
            }))
        }, 1000)
        await this.wait()
        this.conn!.send(JSON.stringify({
            type: "heartbeat",
            target: {
                channel: channel,
                topic: topic,
            },
            key,
            payload: JSON.stringify(await callback())
        }))

    }
    presence = async (channel:string, topic:string, key:string, data:any) => {
        setInterval(async () => {
            await this.wait()
            console.log(data)
            this.conn!.send(JSON.stringify({
                type: "heartbeat",
                target: {
                    channel: channel,
                    topic: topic,
                },
                key,
                payload: JSON.stringify(data)
            }))
        }, 1000)
        await this.wait()
        this.conn!.send(JSON.stringify({
            type: "heartbeat",
            target: {
                channel: channel,
                topic: topic,
            },
            key,
            payload: JSON.stringify(data)
        }))

    }
    send = async (channel:string, topic:string, data:any) => {
        await this.wait()
        this.conn!.send(JSON.stringify({
            type: "broadcast",
            target: {
                channel: channel,
                topic: topic,
            },
            payload: JSON.stringify(data)
        }))
    }
}

export default Buzz