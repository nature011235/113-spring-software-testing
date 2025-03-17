const test = require('node:test');
const assert = require('assert');
const fs = require('fs');

test.mock.method(fs, 'readFile', (path, encoding, callback) => {
  callback(null, 'Alice\nBob\nCharlie');
});

const { Application, MailSystem } = require('./main');

// MailSystem 測試
test('MailSystem.write', (t) => {
  const mailSystem = new MailSystem();
  const result = mailSystem.write('Alice');
  assert.strictEqual(result, 'Congrats, Alice!');
});

test('MailSystem.send - success case', (t) => {
  const mailSystem = new MailSystem();
  const originalLog = console.log;
  const logs = [];
  console.log = (msg) => logs.push(msg);
  
  const originalRandom = Math.random;
  Math.random = () => 0.8;
  
  const result = mailSystem.send('Alice', 'Test content');
  
  console.log = originalLog;
  Math.random = originalRandom;
  
  assert.strictEqual(result, true);
  assert(logs.includes('mail sent'));
});

test('MailSystem.send - failure case', (t) => {
  const mailSystem = new MailSystem();
  const originalLog = console.log;
  const logs = [];
  console.log = (msg) => logs.push(msg);
  
  const originalRandom = Math.random;
  Math.random = () => 0.2;
  
  const result = mailSystem.send('Alice', 'Test content');
  
  console.log = originalLog;
  Math.random = originalRandom;
  
  assert.strictEqual(result, false);
  assert(logs.includes('mail failed'));
});

// Application 測試
test('Application constructor initialization', async (t) => {
  const app = new Application();
  await new Promise(resolve => setImmediate(resolve));
  
  assert.deepStrictEqual(app.people, ['Alice', 'Bob', 'Charlie']);
  assert.deepStrictEqual(app.selected, []);
  assert(app.mailSystem instanceof MailSystem);
});

test('Application.getNames', async (t) => {
  const app = new Application();
  const [people, selected] = await app.getNames();
  
  assert.deepStrictEqual(people, ['Alice', 'Bob', 'Charlie']);
  assert.deepStrictEqual(selected, []);
});

test('Application.getRandomPerson', (t) => {
  const app = new Application();
  app.people = ['person1', 'person2', 'person3'];
  
  const originalMath = Math.random;
  Math.random = () => 0.5;
  
  const result = app.getRandomPerson();
  Math.random = originalMath;
  
  assert.strictEqual(result, 'person2');
});

test('Application.getRandomPerson - empty array', (t) => {
  const app = new Application();
  app.people = [];
  const result = app.getRandomPerson();
  assert.strictEqual(result, undefined);
});

test('Application.selectNextPerson - normal case', (t) => {
  const app = new Application();
  app.people = ['person1', 'person2', 'person3'];
  app.selected = [];
  
  const originalGetRandomPerson = app.getRandomPerson;
  app.getRandomPerson = () => 'person2';
  
  const result = app.selectNextPerson();
  app.getRandomPerson = originalGetRandomPerson;
  
  assert.strictEqual(result, 'person2');
  assert.deepStrictEqual(app.selected, ['person2']);
});

test('Application.selectNextPerson - already selected case', (t) => {
  const app = new Application();
  app.people = ['person1', 'person2', 'person3'];
  app.selected = ['person2'];
  
  let callCount = 0;
  const originalGetRandomPerson = app.getRandomPerson;
  app.getRandomPerson = () => {
    return callCount++ === 0 ? 'person2' : 'person1';
  };
  
  const result = app.selectNextPerson();
  app.getRandomPerson = originalGetRandomPerson;
  
  assert.strictEqual(result, 'person1');
  assert.deepStrictEqual(app.selected, ['person2', 'person1']);
});

test('Application.selectNextPerson - all selected', (t) => {
  const app = new Application();
  app.people = ['person1', 'person2'];
  app.selected = ['person1', 'person2'];
  
  const result = app.selectNextPerson();
  assert.strictEqual(result, null);
});

test('Application.notifySelected', (t) => {
  const app = new Application();
  app.people = ['person1', 'person2', 'person3'];
  app.selected = ['person1', 'person3'];
  
  let writeCount = 0;
  let sendCount = 0;
  const originalWrite = app.mailSystem.write;
  const originalSend = app.mailSystem.send;
  
  app.mailSystem.write = (name) => {
    writeCount++;
    return `Test content for ${name}`;
  };
  
  app.mailSystem.send = (name, content) => {
    sendCount++;
    return true;
  };
  
  app.notifySelected();
  
  app.mailSystem.write = originalWrite;
  app.mailSystem.send = originalSend;
  
  assert.strictEqual(writeCount, 2);
  assert.strictEqual(sendCount, 2);
});