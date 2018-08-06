<template lang="pug">
div
    p #{name}'s Pug source code!
</template >

<script lang="ts">
module.exports = {
    data: function() {
        return {
            who: 'world'
        }
    }
}
</script>

<style>
:scope {
    color: yellow;
}

p {
    font-size: 16px;
}
</style>

<style scoped src="../css/test.scss"></style>