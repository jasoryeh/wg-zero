// adapted from https://stackoverflow.com/a/49479174
class Serializer {
    constructor(types){
        this.types = types;
    }

    indexOfTypeName(name) {
        for (var i = 0; i < this.types.length; i++) {
            let type = this.types[i];
            if (type.name == name) {
                return i;
            }
        }
        return -1;
    }

    serialize(object) {
        // find the type that this object is made from, if it is supported
        let idx = this.indexOfTypeName(object.constructor.name);
        if (idx == -1) { // type doesn't exist or isnt supported
            throw "type  '" + object.constructor.name + "' not initialized";
        }
        // serialize with type name
        return JSON.stringify([this.types[idx].name, Object.entries(object)]);
    }
    deserialize(jstring) {
        // parse
        let array = JSON.parse(jstring);
        // lookup type by name, return index
        let idx = this.indexOfTypeName(array[0]);
        let object = new this.types[idx](); // instantiate
        array[1].map((e) => {
            object[e[0]] = e[1];
        }); // write properties
        return object; // return
    }
}

module.exports = Serializer;
