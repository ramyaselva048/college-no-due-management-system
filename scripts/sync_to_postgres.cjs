const fs = require('fs');
const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function hashPassword(p) {
  const salt = 'college_nodue_salt_v1';
  return crypto.scryptSync(p, salt, 32).toString('hex');
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const fileContent = fs.readFileSync('./data/college_db.json', 'utf-8');
    const d = JSON.parse(fileContent);

    // 1. Departments
    for (const dept of d.departments || []) {
      await client.query(`
        INSERT INTO departments (id, name, code, description, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          code = EXCLUDED.code,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active;
      `, [dept.id, dept.name, dept.code, dept.description, dept.is_active, dept.created_at]);
    }
    console.log('Synced departments:', d.departments.length);

    // 2. Courses
    for (const c of d.courses || []) {
      await client.query(`
        INSERT INTO courses (id, name, code, department_id, duration, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          code = EXCLUDED.code,
          department_id = EXCLUDED.department_id,
          duration = EXCLUDED.duration,
          is_active = EXCLUDED.is_active;
      `, [c.id, c.name, c.code, c.department_id, c.duration, c.is_active, c.created_at]);
    }
    console.log('Synced courses:', d.courses.length);

    // 3. Due Categories
    for (const cat of d.dueCategories || []) {
      await client.query(`
        INSERT INTO due_categories (id, name, code, description, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          code = EXCLUDED.code,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active;
      `, [cat.id, cat.name, cat.code, cat.description, cat.is_active, cat.created_at]);
    }
    console.log('Synced due categories:', d.dueCategories.length);

    // Clean obsolete users and fake students
    await client.query("DELETE FROM users WHERE role = 'ADMIN' AND LOWER(email) != 'ramya@sasurie.edu'");
    await client.query("DELETE FROM students WHERE LOWER(email) = 'student@college.edu' OR register_number = '2022BCSE042'");
    await client.query("DELETE FROM users WHERE LOWER(email) = 'student@college.edu'");

    // 4. Users
    for (const u of d.users || []) {
      await client.query(`
        INSERT INTO users (id, email, password_hash, role, is_active, is_registered, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          is_active = EXCLUDED.is_active,
          is_registered = EXCLUDED.is_registered;
      `, [u.id, u.email, u.password_hash, u.role, u.is_active, u.is_registered || false, u.created_at, u.updated_at || null]);
    }
    console.log('Synced users:', d.users.length);

    // 5. Staff
    for (const s of d.staff || []) {
      await client.query(`
        INSERT INTO staff (id, user_id, employee_id, full_name, email, phone, department_id, designation, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          employee_id = EXCLUDED.employee_id,
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          department_id = EXCLUDED.department_id,
          designation = EXCLUDED.designation;
      `, [s.id, s.user_id, s.employee_id, s.full_name, s.email, s.phone, s.department_id, s.designation, s.created_at]);
    }
    console.log('Synced staff:', d.staff.length);

    // 6. Students
    for (const st of d.students || []) {
      await client.query(`
        INSERT INTO students (id, user_id, register_number, full_name, email, phone, department_id, course_id, year, section, admission_year, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          register_number = EXCLUDED.register_number,
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          department_id = EXCLUDED.department_id,
          course_id = EXCLUDED.course_id,
          year = EXCLUDED.year,
          section = EXCLUDED.section,
          admission_year = EXCLUDED.admission_year;
      `, [st.id, st.user_id, st.register_number, st.full_name, st.email, st.phone, st.department_id, st.course_id, st.year, st.section, st.admission_year, st.created_at]);
    }
    console.log('Synced students:', d.students.length);

    // 7. Clean fake dues (PERSISTENCE TEST etc.)
    await client.query("DELETE FROM due_records WHERE description LIKE '%PERSISTENCE TEST%'");

    await client.query('COMMIT');
    console.log('PostgreSQL database synchronization finished successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PostgreSQL database synchronization error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
