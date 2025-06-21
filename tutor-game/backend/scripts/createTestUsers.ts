import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUsers() {
  try {
    // Create test teacher
    console.log('Creating test teacher...');
    const hashedTeacherPassword = await bcrypt.hash('testteacher123', 10);
    const teacher = await prisma.user.upsert({
      where: { email: 'testteacher@example.com' },
      update: {},
      create: {
        email: 'testteacher@example.com',
        password: hashedTeacherPassword,
        firstName: 'Test',
        lastName: 'Teacher',
        role: Role.TEACHER,
        teacher: {
          create: {}
        }
      },
      include: { teacher: true }
    });

    // Verify teacher was created successfully
    if (!teacher || !teacher.teacher) {
      throw new Error('❌ Failed to create teacher. Cannot create student without a teacher.');
    }
    console.log(`✅ Teacher created: ${teacher.email} (ID: ${teacher.id})`);

    // Create test student
    console.log('\nCreating test student...');
    const hashedStudentPassword = await bcrypt.hash('teststudent123', 10);
    
    // First, create the student user
    const student = await prisma.user.upsert({
      where: { email: 'teststudent@example.com' },
      update: {},
      create: {
        email: 'teststudent@example.com',
        password: hashedStudentPassword,
        firstName: 'Test',
        lastName: 'Student',
        role: Role.STUDENT,
        student: {
          create: {}
        }
      },
      include: { student: true }
    });

    // Then connect the student to the teacher using the many-to-many relation
    if (student.student) {
      await prisma.teacher.update({
        where: { userId: teacher.id },
        data: {
          students: {
            connect: {
              userId: student.id  // Connect using the userId field
            }
          }
        }
      });
      console.log(`✅ Student connected to teacher: ${student.email}`);
    }

    if (!student || !student.student) {
      throw new Error('❌ Failed to create student.');
    }

    // Fetch the teacher with students to verify the connection
    const updatedTeacher = await prisma.teacher.findUnique({
      where: { userId: teacher.id },
      include: {
        students: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    console.log('\n✅ Test users created successfully:');
    console.log(`Teacher: ${teacher.email} (ID: ${teacher.id})`);
    console.log(`Student: ${student.email} (ID: ${student.id})`);
    
    if (updatedTeacher && updatedTeacher.students.length > 0) {
      console.log('\n📚 Teacher-Student Connections:');
      updatedTeacher.students.forEach(s => {
        console.log(`   - ${s.user.firstName} ${s.user.lastName} (${s.user.email})`);
      });
    }

    console.log('\n🔑 You can now log in with these credentials:');
    console.log('   Teacher: testteacher@example.com / testteacher123');
    console.log('   Student: teststudent@example.com / teststudent123');
  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();
