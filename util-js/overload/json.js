JSON.stringif=function(o, d) {
    var _stringif=JSON.stringify(o, function(key, value) {
        if (typeof value === "function") {
          return "/$(" + value.toString() + ")/";
        }
        return value;
    }, d)
return _stringif
}

JSON.parsef=function(json){
    var _parsef=JSON.parse(json, function(key, value) {
        if (typeof value === "string" &&
            value.startsWith("/$(") &&
            value.endsWith(")/")) {
        value = value.substring(3, value.length - 2);
        return (0, eval)("(" + value + ")");
        }
        return value
    });
    return _parsef
}

/*
test

var obj = { 
    a:1, 
    b: function() { return (this.a) }
    }

var obj2=JSON.parsef(JSON.stringif(obj))

console.log(obj2.b(), obj2.a)

obj2.a=17
console.log(obj2.b(), obj2.a)
*/