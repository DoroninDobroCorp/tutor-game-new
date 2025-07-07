import { PrismaClient, Role, LessonType, LessonStatus, BadgeStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  try {
    // Delete existing data
    await prisma.refreshToken.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.studentPerformanceLog.deleteMany({});
    await prisma.lesson.deleteMany({});
    await prisma.contentSection.deleteMany({});
    await prisma.learningGoal.deleteMany({});
    await prisma.badge.deleteMany();
    
    // Delete teachers and students (this will cascade to users due to onDelete: Cascade)
    await prisma.teacher.deleteMany({});
    await prisma.student.deleteMany({});
    await prisma.user.deleteMany({});

    // --- Create Teacher ---
    console.log('Creating test teacher...');
    const hashedTeacherPassword = await bcrypt.hash('testteacher123', 10);
    const teacherUser = await prisma.user.create({
      data: {
        email: 'testteacher@example.com',
        password: hashedTeacherPassword,
        firstName: 'Test',
        lastName: 'Teacher',
        role: Role.TEACHER,
        teacher: {
          create: {}
        },
      },
      include: {
        teacher: true
      }
    });
    console.log(`✅ Teacher created: ${teacherUser.email} (ID: ${teacherUser.id})`);

    // --- Create Student ---
    console.log('\nCreating test student...');
    const hashedStudentPassword = await bcrypt.hash('teststudent123', 10);
    const studentUser = await prisma.user.create({
      data: {
        email: 'teststudent@example.com',
        password: hashedStudentPassword,
        firstName: 'Test',
        lastName: 'Student',
        role: Role.STUDENT,
        student: {
          create: {}
        },
      },
      include: {
        student: true
      }
    });
    console.log(`✅ Student created: ${studentUser.email} (ID: ${studentUser.id})`);

    // --- Connect Student to Teacher ---
    await prisma.teacher.update({
      where: { userId: teacherUser.id },
      data: {
        students: {
          connect: {
            userId: studentUser.id
          }
        }
      }
    });
    console.log('✅ Student connected to teacher');

    // --- Create a sample learning goal ---
    const learningGoal = await prisma.learningGoal.create({
      data: {
        subject: 'Mathematics',
        setting: 'Online',
        studentAge: 12,
        teacherId: teacherUser.id,
        studentId: studentUser.id,
        sections: {
          create: [
            {
              title: 'Introduction to Algebra',
              order: 1,
              lessons: {
                create: [
                  { 
                    title: 'Basic Variables', 
                    order: 1, 
                    type: LessonType.THEORY, 
                    status: LessonStatus.DRAFT 
                  },
                  { 
                    title: 'Simple Equations', 
                    order: 2, 
                    type: LessonType.PRACTICE, 
                    status: LessonStatus.DRAFT 
                  }
                ]
              }
            },
            {
              title: 'Geometry Basics',
              order: 2,
              lessons: {
                create: [
                  { 
                    title: 'Shapes and Angles', 
                    order: 1, 
                    type: LessonType.THEORY, 
                    status: LessonStatus.DRAFT 
                  },
                  { 
                    title: 'Area and Perimeter', 
                    order: 2, 
                    type: LessonType.PRACTICE, 
                    status: LessonStatus.DRAFT 
                  }
                ]
              }
            }
          ]
        }
      },
      include: {
        sections: {
          include: {
            lessons: true
          }
        }
      }
    });

    console.log('✅ Created sample learning goal with sections and lessons');

    // --- Create a sample badge for the student ---
    await prisma.badge.create({
      data: {
        title: 'Math Beginner',
        status: BadgeStatus.EARNED,
        studentId: studentUser.id
      }
    });
    console.log('✅ Created sample badge for the student');

    console.log('\n✅ Test data created successfully!');
    console.log('\nYou can now log in with these credentials:');
    console.log('Teacher: testteacher@example.com / testteacher123');
    console.log('Student: teststudent@example.com / teststudent123');

  } catch (error) {
    console.error('Error creating test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the main function
main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  });
