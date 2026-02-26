
// Helper library for displaying trees using tree_viewer.html

(function(global) {

    const TreeVisualizer = {
        
        /**
         * Serializes a function_trees.js Tree object into a plain data structure for the viewer.
         * @param {Object} tree - The Tree object or Node object.
         * @returns {Object} - Serialized data { type, label, nodes: [] }
         */
        serialize: function(tree) {
            if (!tree) return null;
            // If it's a Tree wrapper with a root property
            if (tree.root && tree.root.constructor) {
                return this._serializeNode(tree.root);
            }
            // If it's a Node directly
            return this._serializeNode(tree);
        },

        _serializeNode: function(node) {
            const data = {
                type: node.constructor.name,
                nodes: []
            };

            // Extract useful labels based on node type
            if (node.constructor.name === 'Variable') {
                data.label = node.name;
            } else if (node.constructor.name === 'Param') {
                data.label = node.param.value.toFixed(2); // Truncate float
            } else if (node.constructor.name === 'IntParameter' || node.constructor.name === 'FloatParameter') {
                 data.label = String(node.value);
            } else {
                data.label = node.constructor.name;
            }

            if (node.nodes && Array.isArray(node.nodes)) {
                data.nodes = node.nodes.map(n => this._serializeNode(n));
            }

            return data;
        },

        /**
         * Opens the tree in a new browser tab/window.
         * @param {Object} tree - The tree to display.
         */
        openInNewTab: function(tree) {
            const data = this.serialize(tree);
            const win = window.open('tree_viewer.html', '_blank');
            if (!win) {
                console.error("Popup blocked!");
                return;
            }

            // Send data when the window is ready
            // We poll a bit or wait for onload, but onload might fire before we attach if local.
            // Best reliable way for popups:
            const interval = setInterval(() => {
                if (win.closed) {
                    clearInterval(interval);
                    return;
                }
                // Post message repeatedly until handled or simple timeout? 
                // Better: The viewer is robust to receiving messages.
                win.postMessage(data, '*');
            }, 500);

            // Stop posting after a few seconds
            setTimeout(() => clearInterval(interval), 3000);
        },

        /**
         * Creates an Iframe element displaying the tree.
         * @param {Object} tree - The tree to display.
         * @param {Object} options - { width, height, style }
         * @returns {HTMLIFrameElement}
         */
        createIframe: function(tree, options = {}) {
            const iframe = document.createElement('iframe');
            iframe.src = 'tree_viewer.html';
            iframe.width = options.width || '100%';
            iframe.height = options.height || '400px';
            iframe.style.border = '1px solid #444';
            if (options.style) Object.assign(iframe.style, options.style);

            const data = this.serialize(tree);
            
            iframe.onload = () => {
                iframe.contentWindow.postMessage(data, '*');
            };

            return iframe;
        },
        
        /**
         * Updates an existing iframe with a new tree.
         * @param {HTMLIFrameElement} iframe 
         * @param {Object} tree 
         */
        updateIframe: function(iframe, tree) {
            const data = this.serialize(tree);
            iframe.contentWindow.postMessage(data, '*');
        }
    };

    global.TreeVisualizer = TreeVisualizer;

})(typeof window !== 'undefined' ? window : this);
