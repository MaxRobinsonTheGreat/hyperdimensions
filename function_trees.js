class FloatParameter {
    constructor(value=null, min=null, max=null) {
        this.min = min === null ? -1 : min;
        this.max = max === null ? 1 : max;
        this.value = value === null ? Math.random()*(this.max-this.min) + this.min : value;
    }

    mutate(range) {
        this.value += (Math.random()-0.5) * range;
    }

    toString() {
        const val = this.value;
        return val > 0 ? val : `(${val})`;
    }

    toGLSL() {
        let s = this.value.toString();
        if (s.indexOf('.') === -1 && s.indexOf('e') === -1) s += '.0';
        return this.value > 0 ? s : `(${s})`;
    }
}

class IntParameter {
    constructor(value=null, min=null, max=null) {
        this.min = min === null ? -1 : min;
        this.max = max === null ? 1 : max;
        if (value === null)
            this.value = Math.floor(Math.random()*(max-min) + min);
    }

    mutate(range) {
        this.value += Math.max(1, Math.floor(Math.random() * range * 2) - range);
        this.value = Math.max(this.value, this.min);
        this.value = Math.min(this.value, this.max);
    }

    toString() {
        const val = this.value;
        return val > 0 ? val : `(${val})`;
    }

    toGLSL() {
        return this.value.toFixed(1);
    }
}

class Node {
    nodes = []; // sub_nodes
    params = []; // params

    constructor(tree) {
        this.tree = tree;
    }
    
    eval(input) {
        throw new Error('Base node cannot eval');
    }

    mutate(options) {
        if (this.nodes.length > 0) {
            // sub node to mutate
            let sub_node_i = Math.floor(Math.random()*this.nodes.length);
            const sub_node = this.nodes[sub_node_i];

            const replacement_mutation = options.graft_rate < Math.random();
            if (replacement_mutation) {
                // if current node is linear, we dont want to add a new linear, so exclude it
                let available_nodes = options.available_nodes;
                if (this instanceof Linear) {
                    available_nodes = [...available_nodes.filter(node => node !== 'linear')];
                }
                const newNode = newRandomNode(this.tree, available_nodes);

                if (Math.random() < 0.5) {
                    // inherit subtree of replaced node

                    const remaining_new_i = newNode.nodes.map((_, i) => i);
                    const remaining_cur_i = sub_node.nodes.map((_, i) => i);

                    // randomly replace nodes in newNode with nodes in sub_node, without duplication
                    // (doesn't destroy sub trees)
                    while (remaining_new_i.length > 0 && remaining_cur_i.length > 0) {
                        const new_i = remaining_new_i.splice(Math.floor(Math.random()*remaining_new_i.length), 1)[0];
                        const cur_i = remaining_cur_i.splice(Math.floor(Math.random()*remaining_cur_i.length), 1)[0];
                        newNode.nodes[new_i] = sub_node.nodes[cur_i];
                    }
                }
                // otherwise, just replace the node with the new node
                this.nodes[sub_node_i] = newNode;
            }
            else {
                let source_function = options.gene_pool[Math.floor(Math.random()*options.gene_pool.length)];
                let other_nodes = source_function.getRandomTree().getNodes()
                other_nodes.shift(); // remove first root node, we never want to copy it
                other_nodes = other_nodes.filter(node => node !== sub_node && node);
                if (other_nodes.length > 0) {
                    const other_node = other_nodes[Math.floor(Math.random()*other_nodes.length)];
                    const graft_node = this.tree._cloneNode(other_node, this.tree);
                    this.nodes[sub_node_i] = graft_node;
                }
            }
        }
    }

    getRawJS() {
        throw new Error('Base node cannot getRawJS');
    }

    getRawGLSL() {
        // default to JS, many nodes will have the same GLSL as JS
        return this.getRawJS();
    }
}

class Root extends Node {
    constructor(tree, start_node=null) {
        super(tree)
        this.nodes = [start_node === null ? new Variable(tree) : start_node]
    }

    eval(input) {
        return this.nodes[0].eval(input);
    }

    getRawJS() {
        return this.nodes[0].getRawJS();
    }

    getRawGLSL() {
        return this.nodes[0].getRawGLSL();
    }
}

class Variable extends Node {
    constructor(tree) {
        super(tree);
        this.mutate();
    }

    eval(input) {
        return input[this.name];
    }

    mutate(options) {
        this.name = this.tree.inputNames[Math.floor(Math.random()*this.tree.inputNames.length)];
    }

    getRawJS() {
        return this.name;
    }
}

class Constant extends Node {
    constructor(tree) {
        super(tree)
        this.param = new FloatParameter();
    }

    eval(input) {
        return this.param.value;
    }

    mutate(options) {
        this.param.mutate(1);
    }

    getRawJS() {
        return this.param.toString();
    }

    getRawGLSL() {
        return this.param.toGLSL();
    }
}

class Binary extends Node {
    constructor(tree) {
        super(tree)
        this.nodes = [
            new Variable(tree),
            new Variable(tree)
        ]
    }
}

class Add extends Binary {
    eval(input) {
        const a = this.nodes[0].eval(input)
        const b = this.nodes[1].eval(input)
        return a + b;
    }

    getRawJS() {
        return `(${this.nodes[0].getRawJS()} + ${this.nodes[1].getRawJS()})`;
    }

    getRawGLSL() {
        return `(${this.nodes[0].getRawGLSL()} + ${this.nodes[1].getRawGLSL()})`;
    }
}

class Multiply extends Binary {
    eval(input) {
        const a = this.nodes[0].eval(input)
        const b = this.nodes[1].eval(input)
        return a * b;
    }

    getRawJS() {
        return `(${this.nodes[0].getRawJS()} * ${this.nodes[1].getRawJS()})`;
    }

    getRawGLSL() {
        return `(${this.nodes[0].getRawGLSL()} * ${this.nodes[1].getRawGLSL()})`;
    }
}

class Divide extends Binary {
    eval(input) {
        const a = this.nodes[0].eval(input)
        const b = this.nodes[1].eval(input)
        return a / b;
    }

    getRawJS() {
        return `(${this.nodes[0].getRawJS()} / ${this.nodes[1].getRawJS()})`;
    }

    getRawGLSL() {
        return `(${this.nodes[0].getRawGLSL()} / ${this.nodes[1].getRawGLSL()})`;
    }
}

class Max extends Binary {
    eval(input) {
        const a = this.nodes[0].eval(input)
        const b = this.nodes[1].eval(input)
        return Math.max(a, b);
    }

    getRawJS() {
        return `Math.max(${this.nodes[0].getRawJS()}, ${this.nodes[1].getRawJS()})`;
    }

    getRawGLSL() {
        return `max(${this.nodes[0].getRawGLSL()}, ${this.nodes[1].getRawGLSL()})`;
    }
}

class Min extends Binary {
    eval(input) {
        const a = this.nodes[0].eval(input)
        const b = this.nodes[1].eval(input)
        return Math.min(a, b);
    }
    getRawJS() {
        return `Math.min(${this.nodes[0].getRawJS()}, ${this.nodes[1].getRawJS()})`;
    }

    getRawGLSL() {
        return `min(${this.nodes[0].getRawGLSL()}, ${this.nodes[1].getRawGLSL()})`;
    }
}

class Unary extends Node {
    constructor(tree) {
        super(tree)
        this.nodes = [new Variable(tree)]
    }
}

class Linear extends Unary {
    constructor(tree) {
        super(tree)
        this.params = [
            new FloatParameter(),
            new FloatParameter(),
        ];
    }
    eval(input) {
        return this.params[0].value * this.nodes[0].eval(input) + this.params[1].value;
    }

    getRawJS() {
        return `(${this.params[0].toString()} * ${this.nodes[0].getRawJS()} + ${this.params[1].toString()})`;
    }

    getRawGLSL() {
        return `(${this.params[0].toGLSL()} * ${this.nodes[0].getRawGLSL()} + ${this.params[1].toGLSL()})`;
    }
}

class Sine extends Unary {
    eval(input) {
        return Math.sin(this.nodes[0].eval(input))
    }

    getRawJS() {
        return `Math.sin(${this.nodes[0].getRawJS()})`;
    }

    getRawGLSL() {
        return `sin(${this.nodes[0].getRawGLSL()})`;
    }
}

class Cosine extends Unary {
    eval(input) {
        return Math.cos(this.nodes[0].eval(input))
    }

    getRawJS() {
        return `Math.cos(${this.nodes[0].getRawJS()})`;
    }

    getRawGLSL() {
        return `cos(${this.nodes[0].getRawGLSL()})`;
    }
}

class Tanh extends Unary {
    eval(input) { 
        return Math.tanh(this.nodes[0].eval(input)) 
    }

    getRawJS() {
        return `Math.tanh(${this.nodes[0].getRawJS()})`;
    }

    getRawGLSL() {
        const x = this.nodes[0].getRawGLSL();
        return `((exp(2.0 * (${x})) - 1.0) / (exp(2.0 * (${x})) + 1.0))`;
    }
}

class Abs extends Unary {
    eval(input) {
        return Math.abs(this.nodes[0].eval(input))
    }

    getRawJS() {
        return `Math.abs(${this.nodes[0].getRawJS()})`;
    }

    getRawGLSL() {
        return `abs(${this.nodes[0].getRawGLSL()})`;
    }
}

class Sigmoid extends Unary {
    eval(input) {
        return 1 / (1 + Math.exp(-this.nodes[0].eval(input)))
    }

    getRawJS() {
        return `(1 / (1 + Math.exp(-${this.nodes[0].getRawJS()})))`;
    }

    getRawGLSL() {
        return `(1.0 / (1.0 + exp(-${this.nodes[0].getRawGLSL()})))`;
    }
}

class Gaussian extends Unary {
    eval(input) {
        return Math.exp(-Math.pow(this.nodes[0].eval(input), 2))
    }

    getRawJS() {
        return `Math.exp(-Math.pow(${this.nodes[0].getRawJS()}, 2))`;
    }

    getRawGLSL() {
        return `exp(-pow(${this.nodes[0].getRawGLSL()}, 2.0))`;
    }
}

class Power extends Unary {
    constructor(tree) {
        super(tree)
        this.nodes = [new Variable(tree)]
        this.params = [new IntParameter(null, 1, 10)]
    }

    eval(input) {
        const x = this.nodes[0].eval(input)
        const pow = this.params[0].value;
        return Math.pow(Math.abs(x), pow)
    }
    
    getRawJS() {
        return `Math.pow(Math.abs(${this.nodes[0].getRawJS()}), ${this.params[0].toString()})`;
    }

    getRawGLSL() {
        return `pow(abs(${this.nodes[0].getRawGLSL()}), ${this.params[0].toGLSL()})`;
    }
}

class TriangleWave extends Unary {
    eval(input) {
        const x = this.nodes[0].eval(input)
        return 2 * Math.abs(2 * (x - Math.floor(x + 0.5))) - 1
    }

    getRawJS() {
        const xExpr = this.nodes[0].getRawJS();
        return `((x => 2 * Math.abs(2 * (x - Math.floor(x + 0.5))) - 1)(${xExpr}))`;
    }

    getRawGLSL() {
        const x = this.nodes[0].getRawGLSL();
        return `(2.0 * abs(2.0 * (${x} - floor(${x} + 0.5))) - 1.0)`;
    }
}

class Subtract extends Binary {
    eval(input) {
        return this.nodes[0].eval(input) - this.nodes[1].eval(input);
    }
    getRawJS() {
        return `(${this.nodes[0].getRawJS()} - ${this.nodes[1].getRawJS()})`;
    }
    getRawGLSL() {
        return `(${this.nodes[0].getRawGLSL()} - ${this.nodes[1].getRawGLSL()})`;
    }
}

class Modulo extends Binary {
    eval(input) {
        const a = this.nodes[0].eval(input);
        const b = this.nodes[1].eval(input);
        if (Math.abs(b) < 1e-10) return 0;
        return a - b * Math.floor(a / b);
    }
    getRawJS() {
        const a = this.nodes[0].getRawJS();
        const b = this.nodes[1].getRawJS();
        return `((Math.abs(${b}) < 1e-10) ? 0 : (${a} - ${b} * Math.floor(${a} / ${b})))`;
    }
    getRawGLSL() {
        const a = this.nodes[0].getRawGLSL();
        const b = this.nodes[1].getRawGLSL();
        return `(abs(${b}) < 1e-10 ? 0.0 : mod(${a}, ${b}))`;
    }
}

class Sign extends Unary {
    eval(input) {
        return Math.sign(this.nodes[0].eval(input));
    }
    getRawJS() {
        return `Math.sign(${this.nodes[0].getRawJS()})`;
    }
    getRawGLSL() {
        return `sign(${this.nodes[0].getRawGLSL()})`;
    }
}

const NodeBlocks = {
    "add": Add,
    "subtract": Subtract,
    "multiply": Multiply,
    "divide": Divide,
    "modulo": Modulo,
    "linear": Linear,
    "sine": Sine,
    "cosine": Cosine,
    "tanh": Tanh,
    "max": Max,
    "min": Min,
    "abs": Abs,
    "sign": Sign,
    "sigmoid": Sigmoid,
    "gaussian": Gaussian,
    "power": Power,
    "triangle_wave": TriangleWave,
}

function newRandomNode(tree, available_nodes=null) {
    if (available_nodes === null) {
        available_nodes = Object.keys(NodeBlocks);
    }
    return new NodeBlocks[available_nodes[Math.floor(Math.random()*available_nodes.length)]](tree);
}


class Tree {
    constructor(parent=null) {
        this.parent = parent;
        this.inputNames = parent.inputNames;
        this.root = new Root(this, new Variable(this));
        this.fn = this.functionalize();
    }

    eval(input) {
        return this.fn(input);
    }

    recursiveEval(input) {
        return this.root.eval(input);
    }

    getRawJS() {
        return this.root.getRawJS();
    }

    getRawGLSL() {
        return this.root.getRawGLSL();
    }

    functionalize() {
        let inputs = this.inputNames.map(name => `const ${name} = input.${name}`).join('; ');
        let code = `function fn(input) { ${inputs}; return ${this.getRawJS()}; } fn;`;
        return eval(code);
    }

    getNodes(cur=this.root) {
        let nodes = [cur];
        if (cur.nodes.length === 0) {
            return nodes;
        }
        for (let sub_node of cur.nodes) {
            nodes.push(...this.getNodes(sub_node));
        }
        return nodes;
    }

    getParams(nodes=null) {
        if (nodes === null) {
            nodes = this.getNodes();
        }
        let params = [];
        for (let node of nodes) {
            params.push(...node.params);
        }
        return params;
    }

    grow(available_nodes=null) {
        if (available_nodes === null) {
            available_nodes = Object.keys(NodeBlocks);
        }
        // find a random leaf node and replace it with a new node
        let parent = null;
        let cur = this.root;
        while (cur.nodes.length > 0) {
            parent = cur;
            cur = cur.nodes[Math.floor(Math.random()*cur.nodes.length)];
        }
        const newNode = newRandomNode(this, available_nodes);
        const index = parent.nodes.indexOf(cur);
        parent.nodes[index] = newNode;
        this.fn = this.functionalize();
    }

    mutate(options) {
        let nodes = this.getNodes();
        let params = this.getParams(nodes);
        let param_mutation = Math.random() < options.param_mutation_rate;
        if (params.length > 0 && param_mutation) {
            let i = Math.floor(Math.random()*params.length);
            params[i].mutate(options.param_mutation_range);
        }
        let node_mutation = Math.random() < options.node_mutation_rate;
        if (nodes.length > 0 && node_mutation) {
            let i = Math.floor(Math.random()*nodes.length);
            nodes[i].mutate(options);
        }
        this.fn = this.functionalize();
    }

    clone() {
        let copy = new Tree(this.parent);
        copy.root = this._cloneNode(this.root, copy);
        copy.fn = copy.functionalize();
        return copy;
    }

    _cloneNode(node, targetTree) {
        let copy = Object.create(Object.getPrototypeOf(node));
        copy.tree = targetTree;
        copy.nodes = [];
        copy.params = [];
        if (node.name !== undefined) copy.name = node.name;
        for (let param of node.params) {
            copy.params.push(new FloatParameter(param.value, param.min, param.max));
        }
        if (node.num !== undefined) {
            copy.num = new IntParameter(node.num.value, node.num.min, node.num.max);
        }
        if (node.iterations !== undefined) copy.iterations = node.iterations;
        for (let child of node.nodes) {
            copy.nodes.push(this._cloneNode(child, targetTree));
        }
        return copy;
    }
}

class TreeFunction {
    constructor(inputNames, outputNames, useInputTrees=true) {
        this.inputNames = inputNames;
        this.outputNames = outputNames;
        this.useInputTrees = useInputTrees;
        this.trees = {};
        for (let outputName of outputNames) {
            this.trees[outputName] = new Tree(this);
        }
        this.inputTrees = {};
        if (useInputTrees) {
            this.initInputTrees();
        }
    }

    initInputTrees() {
        this.useInputTrees = true;
        if (this.useInputTrees) {
            for (let inputName of this.inputNames) {
                this.inputTrees[inputName] = new Tree(this);
            }
        }
    }

    randomizeTrees(size=5, available_nodes=null) {
        for (let outputName in this.trees) {
            const treeSize = size === null ? Math.floor(Math.random() * 6) + 1 : size;
            for (let i = 0; i < treeSize; i++) {
                this.trees[outputName].grow(available_nodes);
            }
        }
        if (this.useInputTrees) {
            for (let inputName in this.inputTrees) {
                const treeSize = size === null ? Math.floor(Math.random() * 6) + 1 : size;
                for (let i = 0; i < treeSize; i++) {
                    this.inputTrees[inputName].grow(available_nodes);
                }
            }
        }
    }

    eval(input) {
        let transformedInput = input;
        if (this.useInputTrees) {
            transformedInput = Object.assign({}, input);
            for (let inputName in this.inputTrees) {
                transformedInput[inputName] = this.inputTrees[inputName].eval(input);
            }
        }
        let outputs = {};
        for (let outputName in this.trees) {
            outputs[outputName] = this.trees[outputName].eval(transformedInput);
        }
        return outputs;
    }

    mutate(options={}) {
        let default_options = {
            param_mutation_rate: 0.5,
            param_mutation_range: 1,
            node_mutation_rate: 0.5,
            graft_rate: 0.5,
            gene_pool: [this],
            available_nodes: Object.keys(NodeBlocks),
        };
        options = Object.assign(default_options, options);
        this.getRandomTree().mutate(options);
    }

    getRandomTree() {
        const trees = [...Object.values(this.trees)];
        if (this.useInputTrees) {
            trees.push(...Object.values(this.inputTrees));
        }
        return trees[Math.floor(Math.random()*trees.length)];
    }

    getGLSL(function_name) {
        let inputs = this.inputNames.map(name => `in float _in_${name}`).join(', ');
        let outputs = this.outputNames.map(name => `out float _out_${name}`).join(', ');
        let args = [inputs, outputs].filter(s => s.length > 0).join(', ');
        
        let code = `void ${function_name}(${args}) {\n`;
        
        // Initialize variables from inputs
        for (let name of this.inputNames) {
            code += `    float ${name} = _in_${name};\n`;
        }
        
        if (this.useInputTrees) {
            // Compute transformed inputs first (using original values)
            let transforms = [];
            for (let name of this.inputNames) {
                if (this.inputTrees[name]) {
                    transforms.push(`    float _next_${name} = ${this.inputTrees[name].getRawGLSL()};\n`);
                } else {
                    transforms.push(`    float _next_${name} = ${name};\n`);
                }
            }
            code += transforms.join('');
            
            // Apply transformations
            for (let name of this.inputNames) {
                code += `    ${name} = _next_${name};\n`;
            }
        }
        
        // Compute outputs
        for (let name of this.outputNames) {
            code += `    _out_${name} = ${this.trees[name].getRawGLSL()};\n`;
        }
        
        code += `}\n`;
        return code;
    }

    clone() {
        let copy = new TreeFunction(this.inputNames, this.outputNames, this.useInputTrees);
        for (let name of this.outputNames) {
            copy.trees[name] = this.trees[name].clone();
        }
        if (this.useInputTrees) {
            for (let inputName of this.inputNames) {
                copy.inputTrees[inputName] = this.inputTrees[inputName].clone();
            }
        }
        return copy;
    }
}

function test() {
    const treefn = new TreeFunction(["x"], ["y"], false);
    const num_mutations = 1000;
    let largest = 0;
    let last = 0;
    let num_destructive = 0;
    for (let i = 0; i < num_mutations; i++) {
        treefn.mutate();
        const treesize = treefn.getRandomTree().getNodes().length;
        if (treesize > largest) {
            largest = treesize;
        }
        if (treesize < last) {
            num_destructive++;
        }
        last = treesize;
    }
    const tree = treefn.getRandomTree();
    console.log('largest', largest);
    console.log('current', tree.getNodes().length);
    console.log('num_destructive', num_destructive, '(', num_destructive / num_mutations * 100 + '%)');

    const test_len = 1000000;
    let start_time = Date.now()
    let treefn_results = [];
    for (let i = 0; i < test_len; i++) {
        treefn_results.push(tree.eval({x: i}));
    }
    console.log('treefn', Date.now() - start_time);
    start_time = Date.now()
    let tree_results = [];
    for (let i = 0; i < test_len; i++) {
        tree_results.push(tree.recursiveEval({x: i}));
    }
    console.log('tree', Date.now() - start_time);

    // calculate average absolute difference between treefn_results and tree_results
    let average_diff = 0;
    for (let i = 0; i < test_len; i++) {
        // if either result is nan, undefined, or null, print the index and the results
        if (isNaN(treefn_results[i]) || isNaN(tree_results[i])) {
            console.log('index', i, 'treefn_result', treefn_results[i], 'tree_result', tree_results[i]);
        }
        else {
            average_diff += Math.abs(treefn_results[i] - tree_results[i]);
        }
    }
    average_diff /= test_len;
    console.log('average_diff', average_diff);
    console.log('all same', treefn_results.every((result, index) => result === tree_results[index]));
}

// test();