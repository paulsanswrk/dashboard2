// Debug script to understand why payment and film aren't connecting
const { findJoinPaths } = require('./autoJoinAlgorithm.ts');

console.log('Debugging payment -> film connection...\n');

// Simplified schema with just the relevant tables
const simpleSchema = [
  {
    tableId: 'payment',
    tableName: 'payment',
    columns: [],
    primaryKey: ['payment_id'],
    foreignKeys: [
      {
        constraintName: 'fk_payment_rental',
        sourceTable: 'payment',
        targetTable: 'rental',
        columnPairs: [{ position: 1, sourceColumn: 'rental_id', targetColumn: 'rental_id' }]
      }
    ]
  },
  {
    tableId: 'rental',
    tableName: 'rental',
    columns: [],
    primaryKey: ['rental_id'],
    foreignKeys: [
      {
        constraintName: 'fk_rental_inventory',
        sourceTable: 'rental',
        targetTable: 'inventory',
        columnPairs: [{ position: 1, sourceColumn: 'inventory_id', targetColumn: 'inventory_id' }]
      }
    ]
  },
  {
    tableId: 'inventory',
    tableName: 'inventory',
    columns: [],
    primaryKey: ['inventory_id'],
    foreignKeys: [
      {
        constraintName: 'fk_inventory_film',
        sourceTable: 'inventory',
        targetTable: 'film',
        columnPairs: [{ position: 1, sourceColumn: 'film_id', targetColumn: 'film_id' }]
      }
    ]
  },
  {
    tableId: 'film',
    tableName: 'film',
    columns: [],
    primaryKey: ['film_id'],
    foreignKeys: []
  }
];

console.log('Testing payment -> film with simplified schema:');
const result1 = findJoinPaths(simpleSchema, ['payment', 'film']);
console.log('Result:', JSON.stringify(result1, null, 2));

console.log('\nTesting with intermediate tables:');
const result2 = findJoinPaths(simpleSchema, ['payment', 'rental', 'inventory', 'film']);
console.log('Result:', JSON.stringify(result2, null, 2));
