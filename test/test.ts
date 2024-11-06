class Json {
    name: any = null;
    say: any = null;
    getThis() {
        return this;
    }
    notify(message: string) {
        console.log(this.name + ":" + message)
    }
}
const json = new Json();
json.name = 'hello'
json.notify('rnm')
const json2 = { ...json }
json2.name = 'world';
json2.notify('wc')