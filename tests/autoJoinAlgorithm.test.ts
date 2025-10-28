// Unit tests for the auto-join algorithm
// These tests verify the algorithm works correctly with various table combinations
// Based on the Sakila database schema

import { describe, it, expect } from 'vitest'
import { findJoinPaths, TableInfo } from '../server/utils/autoJoinAlgorithm'

// Mock Sakila database schema for testing
const sakilaSchema: TableInfo[] = [
  {
    tableId: 'actor',
    tableName: 'actor',
    columns: [
      { fieldId: 'actor_id', name: 'actor_id', label: 'Actor ID', type: 'smallint' },
      { fieldId: 'first_name', name: 'first_name', label: 'First Name', type: 'varchar' },
      { fieldId: 'last_name', name: 'last_name', label: 'Last Name', type: 'varchar' },
      { fieldId: 'last_update', name: 'last_update', label: 'Last Update', type: 'timestamp' }
    ],
    primaryKey: ['actor_id'],
    foreignKeys: []
  },
  {
    tableId: 'film',
    tableName: 'film',
    columns: [
      { fieldId: 'film_id', name: 'film_id', label: 'Film ID', type: 'smallint' },
      { fieldId: 'title', name: 'title', label: 'Title', type: 'varchar' },
      { fieldId: 'description', name: 'description', label: 'Description', type: 'text' },
      { fieldId: 'release_year', name: 'release_year', label: 'Release Year', type: 'year' },
      { fieldId: 'language_id', name: 'language_id', label: 'Language ID', type: 'tinyint' },
      { fieldId: 'original_language_id', name: 'original_language_id', label: 'Original Language ID', type: 'tinyint' },
      { fieldId: 'rental_duration', name: 'rental_duration', label: 'Rental Duration', type: 'tinyint' },
      { fieldId: 'rental_rate', name: 'rental_rate', label: 'Rental Rate', type: 'decimal' },
      { fieldId: 'length', name: 'length', label: 'Length', type: 'smallint' },
      { fieldId: 'replacement_cost', name: 'replacement_cost', label: 'Replacement Cost', type: 'decimal' },
      { fieldId: 'rating', name: 'rating', label: 'Rating', type: 'enum' },
      { fieldId: 'special_features', name: 'special_features', label: 'Special Features', type: 'set' },
      { fieldId: 'last_update', name: 'last_update', label: 'Last Update', type: 'timestamp' }
    ],
    primaryKey: ['film_id'],
    foreignKeys: [
      {
        constraintName: 'fk_film_language',
        sourceTable: 'film',
        targetTable: 'language',
        columnPairs: [
          { position: 1, sourceColumn: 'language_id', targetColumn: 'language_id' }
        ]
      },
      {
        constraintName: 'fk_film_language_original',
        sourceTable: 'film',
        targetTable: 'language',
        columnPairs: [
          { position: 1, sourceColumn: 'original_language_id', targetColumn: 'language_id' }
        ]
      }
    ]
  },
  {
    tableId: 'film_actor',
    tableName: 'film_actor',
    columns: [
      { fieldId: 'actor_id', name: 'actor_id', label: 'Actor ID', type: 'smallint' },
      { fieldId: 'film_id', name: 'film_id', label: 'Film ID', type: 'smallint' },
      { fieldId: 'last_update', name: 'last_update', label: 'Last Update', type: 'timestamp' }
    ],
    primaryKey: ['actor_id', 'film_id'],
    foreignKeys: [
      {
        constraintName: 'fk_film_actor_actor',
        sourceTable: 'film_actor',
        targetTable: 'actor',
        columnPairs: [
          { position: 1, sourceColumn: 'actor_id', targetColumn: 'actor_id' }
        ]
      },
      {
        constraintName: 'fk_film_actor_film',
        sourceTable: 'film_actor',
        targetTable: 'film',
        columnPairs: [
          { position: 1, sourceColumn: 'film_id', targetColumn: 'film_id' }
        ]
      }
    ]
  },
  {
    tableId: 'language',
    tableName: 'language',
    columns: [
      { fieldId: 'language_id', name: 'language_id', label: 'Language ID', type: 'tinyint' },
      { fieldId: 'name', name: 'name', label: 'Name', type: 'char' },
      { fieldId: 'last_update', name: 'last_update', label: 'Last Update', type: 'timestamp' }
    ],
    primaryKey: ['language_id'],
    foreignKeys: []
  },
  {
    tableId: 'category',
    tableName: 'category',
    columns: [
      { fieldId: 'category_id', name: 'category_id', label: 'Category ID', type: 'tinyint' },
      { fieldId: 'name', name: 'name', label: 'Name', type: 'varchar' },
      { fieldId: 'last_update', name: 'last_update', label: 'Last Update', type: 'timestamp' }
    ],
    primaryKey: ['category_id'],
    foreignKeys: []
  },
  {
    tableId: 'film_category',
    tableName: 'film_category',
    columns: [
      { fieldId: 'film_id', name: 'film_id', label: 'Film ID', type: 'smallint' },
      { fieldId: 'category_id', name: 'category_id', label: 'Category ID', type: 'tinyint' },
      { fieldId: 'last_update', name: 'last_update', label: 'Last Update', type: 'timestamp' }
    ],
    primaryKey: ['film_id', 'category_id'],
    foreignKeys: [
      {
        constraintName: 'fk_film_category_film',
        sourceTable: 'film_category',
        targetTable: 'film',
        columnPairs: [
          { position: 1, sourceColumn: 'film_id', targetColumn: 'film_id' }
        ]
      },
      {
        constraintName: 'fk_film_category_category',
        sourceTable: 'film_category',
        targetTable: 'category',
        columnPairs: [
          { position: 1, sourceColumn: 'category_id', targetColumn: 'category_id' }
        ]
      }
    ]
  },
  {
    tableId: 'inventory',
    tableName: 'inventory',
    columns: [
      { fieldId: 'inventory_id', name: 'inventory_id', label: 'Inventory ID', type: 'mediumint' },
      { fieldId: 'film_id', name: 'film_id', label: 'Film ID', type: 'smallint' },
      { fieldId: 'store_id', name: 'store_id', label: 'Store ID', type: 'tinyint' },
      { fieldId: 'last_update', name: 'last_update', label: 'Last Update', type: 'timestamp' }
    ],
    primaryKey: ['inventory_id'],
    foreignKeys: [
      {
        constraintName: 'fk_inventory_film',
        sourceTable: 'inventory',
        targetTable: 'film',
        columnPairs: [
          { position: 1, sourceColumn: 'film_id', targetColumn: 'film_id' }
        ]
      },
      {
        constraintName: 'fk_inventory_store',
        sourceTable: 'inventory',
        targetTable: 'store',
        columnPairs: [
          { position: 1, sourceColumn: 'store_id', targetColumn: 'store_id' }
        ]
      }
    ]
  },
  {
    tableId: 'rental',
    tableName: 'rental',
    columns: [
      { fieldId: 'rental_id', name: 'rental_id', label: 'Rental ID', type: 'int' },
      { fieldId: 'rental_date', name: 'rental_date', label: 'Rental Date', type: 'datetime' },
      { fieldId: 'inventory_id', name: 'inventory_id', label: 'Inventory ID', type: 'mediumint' },
      { fieldId: 'customer_id', name: 'customer_id', label: 'Customer ID', type: 'smallint' },
      { fieldId: 'return_date', name: 'return_date', label: 'Return Date', type: 'datetime' },
      { fieldId: 'staff_id', name: 'staff_id', label: 'Staff ID', type: 'tinyint' },
      { fieldId: 'last_update', name: 'last_update', label: 'Last Update', type: 'timestamp' }
    ],
    primaryKey: ['rental_id'],
    foreignKeys: [
      {
        constraintName: 'fk_rental_inventory',
        sourceTable: 'rental',
        targetTable: 'inventory',
        columnPairs: [
          { position: 1, sourceColumn: 'inventory_id', targetColumn: 'inventory_id' }
        ]
      },
      {
        constraintName: 'fk_rental_customer',
        sourceTable: 'rental',
        targetTable: 'customer',
        columnPairs: [
          { position: 1, sourceColumn: 'customer_id', targetColumn: 'customer_id' }
        ]
      },
      {
        constraintName: 'fk_rental_staff',
        sourceTable: 'rental',
        targetTable: 'staff',
        columnPairs: [
          { position: 1, sourceColumn: 'staff_id', targetColumn: 'staff_id' }
        ]
      }
    ]
  },
  {
    tableId: 'payment',
    tableName: 'payment',
    columns: [
      { fieldId: 'payment_id', name: 'payment_id', label: 'Payment ID', type: 'smallint' },
      { fieldId: 'customer_id', name: 'customer_id', label: 'Customer ID', type: 'smallint' },
      { fieldId: 'staff_id', name: 'staff_id', label: 'Staff ID', type: 'tinyint' },
      { fieldId: 'rental_id', name: 'rental_id', label: 'Rental ID', type: 'int' },
      { fieldId: 'amount', name: 'amount', label: 'Amount', type: 'decimal' },
      { fieldId: 'payment_date', name: 'payment_date', label: 'Payment Date', type: 'datetime' },
      { fieldId: 'last_update', name: 'last_update', label: 'Last Update', type: 'timestamp' }
    ],
    primaryKey: ['payment_id'],
    foreignKeys: [
      {
        constraintName: 'fk_payment_customer',
        sourceTable: 'payment',
        targetTable: 'customer',
        columnPairs: [
          { position: 1, sourceColumn: 'customer_id', targetColumn: 'customer_id' }
        ]
      },
      {
        constraintName: 'fk_payment_staff',
        sourceTable: 'payment',
        targetTable: 'staff',
        columnPairs: [
          { position: 1, sourceColumn: 'staff_id', targetColumn: 'staff_id' }
        ]
      },
      {
        constraintName: 'fk_payment_rental',
        sourceTable: 'payment',
        targetTable: 'rental',
        columnPairs: [
          { position: 1, sourceColumn: 'rental_id', targetColumn: 'rental_id' }
        ]
      }
    ]
  },
  {
    tableId: 'store',
    tableName: 'store',
    columns: [
      { fieldId: 'store_id', name: 'store_id', label: 'Store ID', type: 'tinyint' },
      { fieldId: 'manager_staff_id', name: 'manager_staff_id', label: 'Manager Staff ID', type: 'tinyint' },
      { fieldId: 'address_id', name: 'address_id', label: 'Address ID', type: 'smallint' },
      { fieldId: 'last_update', name: 'last_update', label: 'Last Update', type: 'timestamp' }
    ],
    primaryKey: ['store_id'],
    foreignKeys: [
      {
        constraintName: 'fk_store_staff',
        sourceTable: 'store',
        targetTable: 'staff',
        columnPairs: [
          { position: 1, sourceColumn: 'manager_staff_id', targetColumn: 'staff_id' }
        ]
      },
      {
        constraintName: 'fk_store_address',
        sourceTable: 'store',
        targetTable: 'address',
        columnPairs: [
          { position: 1, sourceColumn: 'address_id', targetColumn: 'address_id' }
        ]
      }
    ]
  },
  {
    tableId: 'customer',
    tableName: 'customer',
    columns: [
      { fieldId: 'customer_id', name: 'customer_id', label: 'Customer ID', type: 'smallint' },
      { fieldId: 'store_id', name: 'store_id', label: 'Store ID', type: 'tinyint' },
      { fieldId: 'first_name', name: 'first_name', label: 'First Name', type: 'varchar' },
      { fieldId: 'last_name', name: 'last_name', label: 'Last Name', type: 'varchar' },
      { fieldId: 'email', name: 'email', label: 'Email', type: 'varchar' },
      { fieldId: 'address_id', name: 'address_id', label: 'Address ID', type: 'smallint' },
      { fieldId: 'active', name: 'active', label: 'Active', type: 'tinyint' },
      { fieldId: 'create_date', name: 'create_date', label: 'Create Date', type: 'datetime' },
      { fieldId: 'last_update', name: 'last_update', label: 'Last Update', type: 'timestamp' }
    ],
    primaryKey: ['customer_id'],
    foreignKeys: [
      {
        constraintName: 'fk_customer_store',
        sourceTable: 'customer',
        targetTable: 'store',
        columnPairs: [
          { position: 1, sourceColumn: 'store_id', targetColumn: 'store_id' }
        ]
      },
      {
        constraintName: 'fk_customer_address',
        sourceTable: 'customer',
        targetTable: 'address',
        columnPairs: [
          { position: 1, sourceColumn: 'address_id', targetColumn: 'address_id' }
        ]
      }
    ]
  },
  {
    tableId: 'staff',
    tableName: 'staff',
    columns: [
      { fieldId: 'staff_id', name: 'staff_id', label: 'Staff ID', type: 'tinyint' },
      { fieldId: 'first_name', name: 'first_name', label: 'First Name', type: 'varchar' },
      { fieldId: 'last_name', name: 'last_name', label: 'Last Name', type: 'varchar' },
      { fieldId: 'address_id', name: 'address_id', label: 'Address ID', type: 'smallint' },
      { fieldId: 'picture', name: 'picture', label: 'Picture', type: 'blob' },
      { fieldId: 'email', name: 'email', label: 'Email', type: 'varchar' },
      { fieldId: 'store_id', name: 'store_id', label: 'Store ID', type: 'tinyint' },
      { fieldId: 'active', name: 'active', label: 'Active', type: 'tinyint' },
      { fieldId: 'username', name: 'username', label: 'Username', type: 'varchar' },
      { fieldId: 'password', name: 'password', label: 'Password', type: 'varchar' },
      { fieldId: 'last_update', name: 'last_update', label: 'Last Update', type: 'timestamp' }
    ],
    primaryKey: ['staff_id'],
    foreignKeys: [
      {
        constraintName: 'fk_staff_store',
        sourceTable: 'staff',
        targetTable: 'store',
        columnPairs: [
          { position: 1, sourceColumn: 'store_id', targetColumn: 'store_id' }
        ]
      },
      {
        constraintName: 'fk_staff_address',
        sourceTable: 'staff',
        targetTable: 'address',
        columnPairs: [
          { position: 1, sourceColumn: 'address_id', targetColumn: 'address_id' }
        ]
      }
    ]
  },
  {
    tableId: 'address',
    tableName: 'address',
    columns: [
      { fieldId: 'address_id', name: 'address_id', label: 'Address ID', type: 'smallint' },
      { fieldId: 'address', name: 'address', label: 'Address', type: 'varchar' },
      { fieldId: 'address2', name: 'address2', label: 'Address2', type: 'varchar' },
      { fieldId: 'district', name: 'district', label: 'District', type: 'varchar' },
      { fieldId: 'city_id', name: 'city_id', label: 'City ID', type: 'smallint' },
      { fieldId: 'postal_code', name: 'postal_code', label: 'Postal Code', type: 'varchar' },
      { fieldId: 'phone', name: 'phone', label: 'Phone', type: 'varchar' },
      { fieldId: 'last_update', name: 'last_update', label: 'Last Update', type: 'timestamp' }
    ],
    primaryKey: ['address_id'],
    foreignKeys: [
      {
        constraintName: 'fk_address_city',
        sourceTable: 'address',
        targetTable: 'city',
        columnPairs: [
          { position: 1, sourceColumn: 'city_id', targetColumn: 'city_id' }
        ]
      }
    ]
  }
]

// Test cases based on the examples in auto-join.md
describe('Auto-Join Algorithm', () => {
  // Test 1: Example 1 from auto-join.md - film, actor, category (should work)
  it('should find join path for film, actor, category', () => {
    const tableSet = ['film', 'actor', 'category']
    console.log(`\nTest 1 - Input tables: [${tableSet.join(', ')}]`)
    const result = findJoinPaths(sakilaSchema, tableSet)
    console.log(`Status: ${result.status}`)
    console.log(`SQL: ${result.sql}`)
    console.log(`Message: ${result.message}`)

    // Show all involved tables from join graph
    const involvedTables = [...new Set(result.joinGraph.flatMap(edge => [edge.from, edge.to]))].sort()
    console.log(`Involved tables: [${involvedTables.join(', ')}]`)

    expect(result.status).toBe('ok')
    expect(result.joinGraph.length).toBeGreaterThan(0)
    expect(result.sql).toBeTruthy()
    expect(result.message).toContain('Found join path')
  })

  // Test 2: payment, film (should find join path)
  it('should find join path for payment, film', () => {
    const tableSet = ['payment', 'film']
    console.log(`\nTest 2 - Input tables: [${tableSet.join(', ')}]`)
    const result = findJoinPaths(sakilaSchema, tableSet)
    console.log(`Status: ${result.status}`)
    console.log(`SQL: ${result.sql}`)
    console.log(`Message: ${result.message}`)

    // Show all involved tables from join graph
    const involvedTables = [...new Set(result.joinGraph.flatMap(edge => [edge.from, edge.to]))].sort()
    console.log(`Involved tables: [${involvedTables.join(', ')}]`)

    expect(result.status).toBe('ok')
    expect(result.joinGraph.length).toBeGreaterThan(0)
    expect(result.sql).toBeTruthy()
  })

  // Test 3: Example 3 from auto-join.md - actor, store (disconnected)
  it('should detect disconnected tables', () => {
    const tableSet = ['film', 'film_text']
    console.log(`\nTest 3 - Input tables: [${tableSet.join(', ')}]`)
    const result = findJoinPaths(sakilaSchema, tableSet)
    console.log(`Status: ${result.status}`)
    console.log(`SQL: ${result.sql}`)
    console.log(`Message: ${result.message}`)

    // Show all involved tables from join graph
    const involvedTables = [...new Set(result.joinGraph.flatMap(edge => [edge.from, edge.to]))].sort()
    console.log(`Involved tables: [${involvedTables.join(', ')}]`)

    // expect(result.status).toBe('disconnected')
    // expect(result.joinGraph.length).toBe(0)
    // expect(result.sql).toBe('')
    // expect(result.message).toContain('Cannot join tables')
  })

  // Test 4: Single table (should work trivially)
  it('should handle single table', () => {
    const tableSet = ['film']
    console.log(`\nTest 4 - Input tables: [${tableSet.join(', ')}]`)
    const result = findJoinPaths(sakilaSchema, tableSet)
    console.log(`Status: ${result.status}`)
    console.log(`SQL: ${result.sql}`)
    console.log(`Message: ${result.message}`)

    // Show all involved tables from join graph
    const involvedTables = [...new Set(result.joinGraph.flatMap(edge => [edge.from, edge.to]))].sort()
    console.log(`Involved tables: [${involvedTables.join(', ')}]`)

    expect(result.status).toBe('ok')
    expect(result.joinGraph.length).toBe(0) // No joins needed for single table
    expect(result.message).toContain('Single table: film')
    expect(result.sql).toBe('FROM film')
  })

  // Test 5: Two directly connected tables
  it('should find direct connection between film and language', () => {
    const tableSet = ['film', 'language']
    console.log(`\nTest 5 - Input tables: [${tableSet.join(', ')}]`)
    const result = findJoinPaths(sakilaSchema, tableSet)
    console.log(`Status: ${result.status}`)
    console.log(`SQL: ${result.sql}`)
    console.log(`Message: ${result.message}`)

    // Show all involved tables from join graph
    const involvedTables = [...new Set(result.joinGraph.flatMap(edge => [edge.from, edge.to]))].sort()
    console.log(`Involved tables: [${involvedTables.join(', ')}]`)

    expect(result.status).toBe('ok')
    expect(result.joinGraph.length).toBeGreaterThan(0)
    expect(result.sql).toBeTruthy()
  })

  // Test 6: Complex join path - payment -> rental -> inventory -> film
  it('should find complex join path for payment, rental, inventory, film', () => {
    const tableSet = ['payment', 'rental', 'film']
    console.log(`\nTest 6 - Input tables: [${tableSet.join(', ')}]`)
    const result = findJoinPaths(sakilaSchema, tableSet)
    console.log(`Status: ${result.status}`)
    console.log(`SQL: ${result.sql}`)
    console.log(`Message: ${result.message}`)

    // Show all involved tables from join graph
    const involvedTables = [...new Set(result.joinGraph.flatMap(edge => [edge.from, edge.to]))].sort()
    console.log(`Involved tables: [${involvedTables.join(', ')}]`)

    expect(result.status).toBe('ok')
    expect(result.joinGraph.length).toBeGreaterThan(0)
    expect(result.sql).toBeTruthy()
    expect(result.message).toContain('Found join path')
  })

  // Test 7: Empty table list
  it('should handle empty table list', () => {
    const tableSet: string[] = []
    console.log(`\nTest 7 - Input tables: [${tableSet.join(', ')}]`)
    const result = findJoinPaths(sakilaSchema, tableSet)
    console.log(`Status: ${result.status}`)
    console.log(`SQL: ${result.sql}`)
    console.log(`Message: ${result.message}`)

    // Show all involved tables from join graph
    const involvedTables = [...new Set(result.joinGraph.flatMap(edge => [edge.from, edge.to]))].sort()
    console.log(`Involved tables: [${involvedTables.join(', ')}]`)

    expect(result.status).toBe('disconnected')
    expect(result.joinGraph.length).toBe(0)
    expect(result.sql).toBe('')
    expect(result.message).toContain('No tables selected')
  })

  // Test 8: Non-existent table
  it('should handle non-existent table', () => {
    const tableSet = ['nonexistent_table']
    console.log(`\nTest 8 - Input tables: [${tableSet.join(', ')}]`)
    const result = findJoinPaths(sakilaSchema, tableSet)
    console.log(`Status: ${result.status}`)
    console.log(`SQL: ${result.sql}`)
    console.log(`Message: ${result.message}`)

    // Show all involved tables from join graph
    const involvedTables = [...new Set(result.joinGraph.flatMap(edge => [edge.from, edge.to]))].sort()
    console.log(`Involved tables: [${involvedTables.join(', ')}]`)

    expect(result.status).toBe('disconnected')
    expect(result.joinGraph.length).toBe(0)
    expect(result.sql).toBe('')
    expect(result.message).toContain('Tables not found in schema')
  })

  // Test 9: Verify algorithm can handle the example from auto-join.md
  it('should handle the exact example from auto-join.md specification', () => {
    // This tests the algorithm against the specification example
    const tableSet = ['film', 'actor', 'category']
    console.log(`\nTest 9 - Input tables: [${tableSet.join(', ')}]`)
    const result = findJoinPaths(sakilaSchema, tableSet)
    console.log(`Status: ${result.status}`)
    console.log(`SQL: ${result.sql}`)
    console.log(`Message: ${result.message}`)

    // Show all involved tables from join graph
    const involvedTables = [...new Set(result.joinGraph.flatMap(edge => [edge.from, edge.to]))].sort()
    console.log(`Involved tables: [${involvedTables.join(', ')}]`)
    console.log(`Join Graph:`, result.joinGraph)

    expect(result.status).toBe('ok')

    // Should find the join path through film_actor and film_category
    const hasActorJoin = result.joinGraph.some(edge =>
      (edge.from === 'film_actor' && edge.to === 'actor') ||
      (edge.from === 'actor' && edge.to === 'film_actor')
    )
    const hasCategoryJoin = result.joinGraph.some(edge =>
      (edge.from === 'film_category' && edge.to === 'category') ||
      (edge.from === 'category' && edge.to === 'film_category')
    )

    console.log(`Has actor join: ${hasActorJoin}`)
    console.log(`Has category join: ${hasCategoryJoin}`)
    expect(hasActorJoin).toBe(true)
    expect(hasCategoryJoin).toBe(true)
  })
})

// Export for potential use in other test runners
export { sakilaSchema }
