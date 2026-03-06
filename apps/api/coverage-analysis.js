const fs = require('fs');
const path = require('path');

// Analyze test files
const modulesPath = './src/modules';
const modules = fs.readdirSync(modulesPath);

const analysis = {};

modules.forEach(module => {
  const modulePath = path.join(modulesPath, module);
  if (!fs.statSync(modulePath).isDirectory()) return;

  const files = fs.readdirSync(modulePath);
  
  const serviceFiles = files.filter(f => f.endsWith('.service.ts') && !f.endsWith('.spec.ts')).length;
  const controllerFiles = files.filter(f => f.endsWith('.controller.ts') && !f.endsWith('.spec.ts')).length;
  const specFiles = files.filter(f => f.endsWith('.spec.ts')).length;
  
  if (specFiles > 0 || serviceFiles > 0) {
    analysis[module] = {
      services: serviceFiles,
      controllers: controllerFiles,
      specs: specFiles,
      coverage: specFiles > 0 ? 'partial' : 'none'
    };
  }
});

// Sort by coverage
const sorted = Object.entries(analysis)
  .sort((a, b) => b[1].specs - a[1].specs);

console.log('\n📊 Test Coverage Analysis\n');
console.log('Module'.padEnd(30) + 'Services'.padEnd(12) + 'Controllers'.padEnd(12) + 'Tests'.padEnd(8) + 'Coverage');
console.log('─'.repeat(80));

let totalServices = 0, totalControllers = 0, totalSpecs = 0;

sorted.forEach(([module, data]) => {
  const coverage = data.specs > 0 ? `✓ ${data.specs} spec${data.specs > 1 ? 's' : ''}` : '✗ None';
  console.log(
    module.padEnd(30) +
    String(data.services).padEnd(12) +
    String(data.controllers).padEnd(12) +
    String(data.specs).padEnd(8) +
    coverage
  );
  totalServices += data.services;
  totalControllers += data.controllers;
  totalSpecs += data.specs;
});

console.log('─'.repeat(80));
console.log(
  'TOTAL'.padEnd(30) +
  String(totalServices).padEnd(12) +
  String(totalControllers).padEnd(12) +
  String(totalSpecs).padEnd(8) +
  `${((totalSpecs / totalServices) * 100).toFixed(1)}% coverage`
);
