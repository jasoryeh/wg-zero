function assert(mustBeTrue, msg) {
    if (!mustBeTrue) {
        throw new Error(msg);
    }
}

class IP4 {
    constructor(part1, part2, part3, part4) {
        assert(
            Number.isInteger(part1) &&
            Number.isInteger(part2) &&
            Number.isInteger(part3) &&
            Number.isInteger(part4),
            "Parts must be a number");
        assert(
            IP4.inRange(part2) &&
            IP4.inRange(part2) &&
            IP4.inRange(part3) &&
            IP4.inRange(part4),
            "Parts must be in range");
        this.part1 = part1;
        this.part2 = part2;
        this.part3 = part3;
        this.part4 = part4;
    }

    static inRange(num) {
        return num >= 0 && num <= 255;
    }

    static of (ipstring) {
        return new IP4(...ipstring.split(".").map(each => parseInt(each)));
    }

    copy() {
        return new IP4(this.part1, this.part2, this.part3, this.part4);
    }

    toString() {
        return `${this.part1}.${this.part2}.${this.part3}.${this.part4}`;
    }

    next() {
        let copy = this.copy();
        if (++copy.part4 <= 255) {
            return copy;
        }
        copy.part4 = 0;
        if (++copy.part3 <= 255) {
            return copy;
        }
        copy.part3 = 0;
        if (++copy.part2 <= 255) {
            return copy;
        }
        copy.part2 = 0;
        if (++copy.part1 <= 255) {
            return copy;
        }
        throw new Error("Reached end of IPV4 space!");
    }

    equals(other) {
        if (!other || other.constructor.name != this.constructor.name) {
            return false;
        }
        return this.part1 == other.part1 && this.part2 == other.part2 && this.part3 == other.part3 && this.part4 == other.part4;
    }
}

class IP6 {
    constructor(part1, part2, part3, part4, part5, part6, part7, part8) {
        assert(
            Number.isInteger(part1) &&
            Number.isInteger(part2) &&
            Number.isInteger(part3) &&
            Number.isInteger(part4),
            "Parts must be a number");
        assert(
            IP6.inRange(part2) &&
            IP6.inRange(part2) &&
            IP6.inRange(part3) &&
            IP6.inRange(part4),
            "Parts must be in range");
        this.part1 = part1;
        this.part2 = part2;
        this.part3 = part3;
        this.part4 = part4;
        this.part5 = part5;
        this.part6 = part6;
        this.part7 = part7;
        this.part8 = part8;
    }

    static inRange(num) {
        return num >= 0 && num <= parseInt('ffff', 16);
    }

    static of (ipstring) {
        let delims = ipstring.split(":").length - 1;
        if (delims < 7) {
            if (!ipstring.includes("::")) {
                throw new Error("Invalid IPV6 address!");
            }
            ipstring = ipstring.replace("::", ":".repeat(2 + (7 - delims)));
        }
        return new IP6(...ipstring.split(":").map(each => (each.trim().length == 0) ? "0" : each).map(each => parseInt(each, 16)));
    }

    copy() {
        return new IP6(this.part1, this.part2, this.part3, this.part4, this.part5, this.part6, this.part7, this.part8);
    }

    static partLimit() {
        return parseInt("ffff", 16);
    }

    static toStringPart(part) {
        return part.toString(16);
    }

    toString() {
        return `${IP6.toStringPart(this.part1)}:${IP6.toStringPart(this.part2)}:${IP6.toStringPart(this.part3)}:${IP6.toStringPart(this.part4)}:${IP6.toStringPart(this.part5)}:${IP6.toStringPart(this.part6)}:${IP6.toStringPart(this.part7)}:${IP6.toStringPart(this.part8)}`;
    }

    next() {
        const limit = IP6.partLimit();
        let copy = this.copy();
        if (++copy.part8 <= limit) {
            return copy;
        }
        copy.part8 = 0;
        if (++copy.part7 <= limit) {
            return copy;
        }
        copy.part7 = 0;
        if (++copy.part6 <= limit) {
            return copy;
        }
        copy.part6 = 0;
        if (++copy.part5 <= limit) {
            return copy;
        }
        copy.part5 = 0;
        if (++copy.part4 <= limit) {
            return copy;
        }
        copy.part4 = 0;
        if (++copy.part3 <= limit) {
            return copy;
        }
        copy.part3 = 0;
        if (++copy.part2 <= limit) {
            return copy;
        }
        copy.part2 = 0;
        if (++copy.part1 <= limit) {
            return copy;
        }
        throw new Error("Reached end of IPV6 space!");
    }

    equals(other) {
        if (!other || other.constructor.name != this.constructor.name) {
            return false;
        }
        return this.part1 == other.part1 && this.part2 == other.part2 && this.part3 == other.part3 && this.part4 == other.part4 
                && this.part5 == other.part5 && this.part6 == other.part6 && this.part7 == other.part7 && this.part8 == other.part8;
    }
}

class IPPool {
    constructor(startAddress) {
        this.start = startAddress;
        this.pool = [ ];
    }

    add(takenAddr) {
        this.pool.push(takenAddr);
    }

    inPool(addr) {
        for (let taken of this.pool) {
            if (taken.equals(addr)) {
                return true;
            }
        }
        return false;
    }

    next(add = true) {
        var next = this.start.next();
        while (this.inPool(next)) {
            next = next.next();
        }
        if (add) {
            this.add(next);
        }
        return next;
    }
}

function ofIPString(ipstring) {
    if (ipstring.includes(".")) {
        return IP4.of(ipstring);
    }
    if (ipstring.includes(":")) {
        return IP6.of(ipstring);
    }
    throw new Error("Unrecognized IP address format!");
}

export { IP6, IP4, IPPool, ofIPString };
export default ofIPString;