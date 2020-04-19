
import io from 'socket.io-client';

class Buzz {
   constructor() {
       this.handlers = {};
       this.presences = {};

       var port = 8080
       this.socket = io('http://localhost:' + port, {
           path: '/socket',
           transports: ['websocket']
       });
       this.socket.on('reconnect', ()=>{
           for (const key in this.handlers){
               var handler = this.handlers[key][0];
               this.socket.emit('subscribe', { channel: handler.channel, topic: handler.topic })
           }
       })
       this.socket.on('disconnect', function () {
           io.socket.removeAllListeners()
       });
       this.socket.on('entry-message', (data) => {   
           var parsed = JSON.parse(atob(data))
           if(this.handlers[parsed.channel + parsed.topic]){
               this.handlers[parsed.channel + parsed.topic].forEach((handler)=>{
                   handler.callback(JSON.parse(parsed.data))
               })
           }
       })
       this.socket.on('entry-presence', (data) => {   
           var parsed = JSON.parse(atob(data))
           var key;
           var values = parsed.map((d)=>{
               var message = JSON.parse(d)
               key = message.channel + message.topic
               return JSON.parse(message.data)
           })
           this.presences[key].forEach((h)=>{
               h.callback(values)
           })
       })
   }
   subscribe = (channel, topic, callback) => {
       this.socket.emit('subscribe', { channel, topic })
       if (this.handlers[channel + topic] === undefined) {
           this.handlers[channel + topic] = [{ channel, topic, callback }]
       } else {
           this.handlers[channel + topic].push({ channel, topic, callback })
       }
   }
   subscribe = (channel, topic, callback) => {
       this.socket.emit('subscribe', { channel, topic })
       if (this.handlers[channel + topic] === undefined) {
           this.handlers[channel + topic] = [{ channel, topic, callback }]
       } else {
           this.handlers[channel + topic].push({ channel, topic, callback })
       }
   }
   presenceSubscribe = (channel, topic, callback) => {
       setInterval(() => {
           this.socket.emit('presence', { channel, topic })
       }, 10000);
       this.socket.emit('presence', { channel, topic });
       if (this.presences[channel + topic] === undefined) {
           this.presences[channel + topic] = [{ channel, topic, callback }]
       } else {
           this.presences[channel + topic].push({ channel, topic, callback })
       }
   }
   presence = (channel, topic, key, data) => {
       setInterval(() => {
           this.socket.emit('heartbeat', { channel, topic, key, data: JSON.stringify(data) })
       }, 10000);
       this.socket.emit('heartbeat', { channel, topic, key, data: JSON.stringify(data) })
   }

   send = (channel, topic, data) => {
       console.log('send-message')
       this.socket.send({ channel, topic, data: JSON.stringify(data) })
   }
}

var b = new Buzz()

export default b