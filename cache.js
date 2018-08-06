
/***********/
/* Exports */
/***********/
module.exports = {
    create() {
        const cache = {};
        return {
            get(id) {
                if (id in cache) {
                    return cache[id];
                }

                return null;
            },
            set(id, value) {
                cache[id] = value;
            },
            has(id) {
                return id in cache;
            }
        }
    }
};