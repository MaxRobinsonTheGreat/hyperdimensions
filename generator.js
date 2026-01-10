class FloatParameter {
    constructor(value=null, min=null, max=null) {
        this.min = min === null ? -1 : min;
        this.max = max === null ? 1 : max;
        this.value = value === null ? Math.random()*(this.max-this.min) + this.min : value;
    }

    mutate(range) {
        this.value += (Math.random()-0.5) * range;
        this.value = Math.max(this.value, this.min);
        this.value = Math.min(this.value, this.max);
    }
}

class IntParameter{
    constructor(value=null, min=null, max=null) {
        this.min = min === null ? -1 : min;
        this.max = max === null ? 1 : max;
        if (value === null)
            this.value = Math.floor(Math.random()*(max-min) + min);
    }

    mutate(range) {
        // todo
        this.value = Math.max(this.value, this.min);
        this.value = Math.min(this.value, this.max);
    }
}

class BoolParameter {
    constructor(value=null) {
        if (value === null)
            this.value = Math.random() > 0.5 + 0;
    }

    mutate(_) {
        this.value = !this.value + 0;
    }
}

class Node {
    nodes = []; // sub_nodes
    
    eval(x) {
        return x;
    }
}

class Param extends Node {
    constructor() {
        super()
        this.param = new FloatParameter();
    }

    eval(x) {
        return this.param.value;
    }
}

class Linear extends Node {
    constructor() {
        super()
        this.nodes = [
            new Param(),
            new Node(),
            new Param()
        ];
    }

    eval(x) {
        const m = this.nodes[0].eval(x)
        const x_ = this.nodes[1].eval(x)
        const b = this.nodes[2].eval(x)
        return m * x_ + b;
    }
}

class Divide extends Node {
    constructor() {
        super()
        this.nodes = [
            new Node(),
            new Param(),
        ]
    }

    eval(x) {
        const num = this.nodes[0].eval(x);
        let denom = this.nodes[1].eval(x);
        denom = denom !== 0 ? denom : 0.00001;
        return num / denom;
    }
}

class Relu extends Node {
    constructor() {
        super();
        this.nodes = [
            new Param(),
            new Node()
        ]
    }

    eval(x) {
        const min = this.nodes[0].eval(x);
        const val = this.nodes[1].eval(x)

        return Math.max(val, min);
    }
}

class Sine extends Node {
    constructor() {
        super();
        this.nodes = [new Node()]
    }

    eval(x) {
        return Math.sin(this.nodes[0].eval(x))
    }
}

class Tanh extends Node {
    constructor() {
        super();
        this.nodes = [new Node()]
    }

    eval(x) {
        return Math.tanh(this.nodes[0].eval(x))
    }
}

// class Power extends Node {
//     constructor() {
//         super();
//         this.params = [
//             new FloatParameter(null, 1, 10)
//         ]
//     }

//     eval(x) {
//         console.log(this.params[0].value)
//         Math.pow(this.sub_nodes[0].eval(x), this.params[0].value)
//     }
// }

class Exponential extends Node {
    constructor() {
        super();
        this.nodes = [
            new Node(),
            new Param()
        ]
    }

    eval(x) {
        const x_ = this.nodes[0].eval()
        const pow = this.nodes[1].eval()
        return Math.pow(x_, pow)
    }
}


const NodeBlocks = [
    Linear,
    Divide,
    Sine,
    Tanh,
    Relu,
    // Power,
    // Exponential
]

function mutate(root) {
    let parent = root;
    let node = root;
    let i = 0;
    let depth = 0;
    while (node.nodes.length > 0) {
        parent = node;
        i = Math.floor(Math.random()*node.nodes.length);
        node = parent.nodes[i];
        depth += 1;
    }
    console.log('mutating', i, 'at depth', depth);
    const newNode = new NodeBlocks[Math.floor(Math.random()*NodeBlocks.length)];
    parent.nodes[i] = newNode;
}

const root = new Linear();

for (let i=0; i<10; i++) {
    mutate(root);
}