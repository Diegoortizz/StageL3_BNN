var should = require('chai').should()
expect = require('chai').expect;
var jsbayes = require('../jsbayes');

var g = jsbayes.newGraph();

var g = jsbayes.newGraph();
var n1 = g.addNode('n1', ['true', 'false']);
var n2 = g.addNode('n2', ['true', 'false']);
var n3 = g.addNode('n3', ['true', 'false']);

n2.addParent(n1);
n3.addParent(n2);


g.reinit()
    .then(function (r) {
        g.saveSamples = true;
        return g.sample(4); //likelihood weight sampling aka the inference
    })
    .then(function (r) {
        console.log(g);
    });