import datetime
import logging
from backend.app.core.database import SessionLocal
from backend.app.core.security import get_password_hash
from backend.app.models.models import (
    User, Department, Course, DueCategory, Student, Staff, DueRecord
)

logger = logging.getLogger("seed")

def seed_initial_data():
    from backend.app.core.database import Base, engine
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Seed Departments
        dept_data = [
            {"name": "Central Library", "code": "LIB", "description": "Library book returns, journal access, and fine clearance."},
            {"name": "Accounts & Finance", "code": "ACC", "description": "Tuition, examination fees, library deposits, and scholarship audits."},
            {"name": "Computer Science Laboratory", "code": "CSL", "description": "Lab equipment, computer hardware, robotics kits, and apparatus check."},
            {"name": "Academic Department (CSE)", "code": "CSE", "description": "Departmental project clearances, symposium dues, and seminar records."},
            {"name": "Hostel & Student Housing", "code": "HST", "description": "Room inventory, mess bill dues, electricity meters, and caution return."},
            {"name": "Transport Services", "code": "TRN", "description": "College bus pass, parking tags, and transport clearance."},
            {"name": "Sports & Physical Education", "code": "SPT", "description": "Sports kit, tournament gear, gym membership, and athletics return."},
            {"name": "Training & Placement Cell", "code": "TPO", "description": "Placement training fee, company drive clearance, and offer verification."}
        ]

        depts = {}
        for d in dept_data:
            existing = db.query(Department).filter(Department.code == d["code"]).first()
            if not existing:
                dept_obj = Department(
                    name=d["name"],
                    code=d["code"],
                    description=d["description"],
                    is_active=True
                )
                db.add(dept_obj)
                db.flush()
                depts[d["code"]] = dept_obj
            else:
                depts[d["code"]] = existing

        db.commit()

        # 2. Seed Courses
        cse_dept = depts.get("CSE") or db.query(Department).filter(Department.code == "CSE").first()
        if cse_dept:
            courses_data = [
                {"name": "B.Tech Computer Science & Engineering", "code": "BTECH_CSE", "dept_id": cse_dept.id, "duration": 4},
                {"name": "B.Tech Information Technology", "code": "BTECH_IT", "dept_id": cse_dept.id, "duration": 4},
                {"name": "B.Tech Electronics & Communication", "code": "BTECH_ECE", "dept_id": cse_dept.id, "duration": 4},
                {"name": "Master of Computer Applications", "code": "MCA", "dept_id": cse_dept.id, "duration": 2}
            ]
            for c in courses_data:
                existing_c = db.query(Course).filter(Course.code == c["code"]).first()
                if not existing_c:
                    course_obj = Course(
                        name=c["name"],
                        code=c["code"],
                        department_id=c["dept_id"],
                        duration=c["duration"],
                        is_active=True
                    )
                    db.add(course_obj)
            db.commit()

        # 3. Seed Due Categories
        cat_data = [
            {"name": "Library Book Overdue Fine", "code": "LIB_BOOK", "description": "Late book return fine per library regulations."},
            {"name": "Tuition & Term Fee", "code": "FEE_TUITION", "description": "Pending semester tuition or registration fee."},
            {"name": "Laboratory Equipment Replacement", "code": "LAB_EQUIP", "description": "Damaged or unreturned lab components."},
            {"name": "Hostel Mess Dues", "code": "HST_MESS", "description": "Unpaid monthly mess bill balance."},
            {"name": "Transport Pass Renewal", "code": "TRN_PASS", "description": "Bus pass semester balance."},
            {"name": "Sports Uniform & Gear", "code": "SPT_GEAR", "description": "College sports jersey or gear unreturned."},
            {"name": "Department Association Dues", "code": "DEPT_ASSOC", "description": "Student symposium or technical chapter dues."}
        ]
        for cat in cat_data:
            existing_cat = db.query(DueCategory).filter(DueCategory.code == cat["code"]).first()
            if not existing_cat:
                cat_obj = DueCategory(
                    name=cat["name"],
                    code=cat["code"],
                    description=cat["description"],
                    is_active=True
                )
                db.add(cat_obj)
        db.commit()

        # 4. Seed Sole Admin User
        admin_email = "ramya@sasurie.edu"
        admin_user = db.query(User).filter(User.email == admin_email).first()
        if not admin_user:
            admin_user = User(
                email=admin_email,
                password_hash=get_password_hash("RamyaSasurie@123"),
                role="ADMIN",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            logger.info(f"Admin seeded: {admin_email} / RamyaSasurie@123")
        else:
            admin_user.role = "ADMIN"
            admin_user.password_hash = get_password_hash("RamyaSasurie@123")
            admin_user.is_active = True
            db.commit()

        # Deactivate any other accounts with ADMIN role
        db.query(User).filter(User.role == "ADMIN", User.email != admin_email).update({"is_active": False})
        db.commit()

        # 5. Seed Staff User (Library & Accounts)
        lib_dept = depts.get("LIB") or db.query(Department).filter(Department.code == "LIB").first()
        if lib_dept:
            staff_email = "staff.library@college.edu"
            staff_user = db.query(User).filter(User.email == staff_email).first()
            if not staff_user:
                staff_user = User(
                    email=staff_email,
                    password_hash=get_password_hash("StaffPassword@123"),
                    role="STAFF",
                    is_active=True
                )
                db.add(staff_user)
                db.flush()

                staff_profile = Staff(
                    user_id=staff_user.id,
                    employee_id="EMP-LIB-101",
                    full_name="Prof. Rajesh Kumar",
                    email=staff_email,
                    phone="+91 98765 43210",
                    department_id=lib_dept.id,
                    designation="Chief Librarian & Clearance Officer"
                )
                db.add(staff_profile)
                db.commit()
                logger.info(f"Staff seeded: {staff_email} / StaffPassword@123")

        # 6. Seed Student User
        btech_course = db.query(Course).filter(Course.code == "BTECH_CSE").first()
        if cse_dept and btech_course:
            student_email = "student@college.edu"
            student_user = db.query(User).filter(User.email == student_email).first()
            if not student_user:
                student_user = User(
                    email=student_email,
                    password_hash=get_password_hash("StudentPassword@123"),
                    role="STUDENT",
                    is_active=True
                )
                db.add(student_user)
                db.flush()

                student_profile = Student(
                    user_id=student_user.id,
                    register_number="2022BCSE042",
                    full_name="Aditya Sharma",
                    email=student_email,
                    phone="+91 91234 56789",
                    department_id=cse_dept.id,
                    course_id=btech_course.id,
                    year=4,
                    section="A",
                    admission_year=2022
                )
                db.add(student_profile)
                db.flush()

                # Add sample cleared due in Library and pending due in Accounts to showcase live due states
                lib_cat = db.query(DueCategory).filter(DueCategory.code == "LIB_BOOK").first()
                acc_dept = depts.get("ACC") or db.query(Department).filter(Department.code == "ACC").first()
                fee_cat = db.query(DueCategory).filter(DueCategory.code == "FEE_TUITION").first()

                if lib_cat and lib_dept:
                    due1 = DueRecord(
                        student_id=student_profile.id,
                        department_id=lib_dept.id,
                        category_id=lib_cat.id,
                        amount=150.0,
                        status="cleared",
                        description="Late return fine - Operating Systems Concepts (Silberschatz)",
                        remarks="Cleared at Central Library counter"
                    )
                    db.add(due1)

                if acc_dept and fee_cat:
                    due2 = DueRecord(
                        student_id=student_profile.id,
                        department_id=acc_dept.id,
                        category_id=fee_cat.id,
                        amount=500.0,
                        status="pending",
                        description="Semester 8 Exam Form & Hall Ticket Processing Fee",
                        remarks="Pending clearance before graduation"
                    )
                    db.add(due2)

                db.commit()
                logger.info(f"Student seeded: {student_email} / StudentPassword@123")

    except Exception as e:
        logger.error(f"Error during seeding: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_initial_data()
