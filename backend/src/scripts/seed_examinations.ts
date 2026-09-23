/**
 * Seed in-person + online examinations for every active class/subject/teacher pair.
 * Usage: npx ts-node --transpile-only src/scripts/seed_examinations.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nokta';
  await mongoose.connect(uri);

  const { ClassModel } = await import('../models/Class');
  const { Subject } = await import('../models/Subject');
  const { User } = await import('../models/User');
  const { Exam } = await import('../models/Exam');
  const { Question } = await import('../models/Question');
  const { buildExamCode, syncExamTeacherAssignment, countAssignedStudents } = await import('../services/examService');

  const classes = await ClassModel.find({ isDeleted: false }).lean<any[]>();
  const subjects = await Subject.find({ isDeleted: false }).lean<any[]>();
  const teachers = await User.find({ role: 'teacher', isDeleted: false }).lean<any[]>();

  if (!classes.length || !subjects.length || !teachers.length) {
    console.error('Need at least one class, subject, and teacher in the database.');
    process.exit(1);
  }

  let created = 0;
  const sampleForm = 'https://docs.google.com/forms/d/e/1FAIpQLScSAMPLE/viewform';

  for (const klass of classes) {
    const classSubjects = subjects.filter((subject) => {
      const ids = [
        ...(Array.isArray(subject.classIds) ? subject.classIds : []),
        subject.classId
      ].map(String).filter(Boolean);
      return ids.includes(String(klass._id)) || ids.length === 0;
    });

    const targetSubjects = classSubjects.length ? classSubjects : subjects.slice(0, 1);

    for (const subject of targetSubjects) {
      const teacher =
        teachers.find((item) => String(item._id) === String(subject.teacher))
        || teachers.find((item) => (item.assignedClasses || []).map(String).includes(String(klass._id)))
        || teachers[0];

      await syncExamTeacherAssignment(String(subject._id), String(klass._id), String(teacher._id));
      const assignedStudentCount = await countAssignedStudents(String(klass._id), String(subject._id));
      const date = new Date();
      date.setDate(date.getDate() + 3);

      const inPersonTitle = `In-person ${subject.title || 'Subject'} — ${klass.className || klass.name}`;
      const onlineTitle = `Online ${subject.title || 'Subject'} — ${klass.className || klass.name}`;

      const existingInPerson = await Exam.findOne({
        title: inPersonTitle,
        class: klass._id,
        subject: subject._id,
        isDeleted: false
      });
      const existingOnline = await Exam.findOne({
        title: onlineTitle,
        class: klass._id,
        subject: subject._id,
        isDeleted: false
      });

      if (!existingInPerson) {
        const exam = await Exam.create({
          title: inPersonTitle,
          description: 'Seeded in-person examination with MCQ, true/false, and descriptive questions.',
          instructions: 'Answer all questions carefully. Descriptive answers require complete sentences.',
          category: 'weekly',
          examType: 'weekly',
          deliveryMethod: 'in_person',
          class: klass._id,
          subject: subject._id,
          teacherId: teacher._id,
          branchId: klass.branchId || subject.branchId || teacher.branchId || null,
          date,
          startTime: '09:00',
          endTime: '10:30',
          durationMinutes: 90,
          totalMarks: 20,
          passingMarks: 10,
          status: 'published',
          isPublished: true,
          publishedAt: new Date(),
          examCode: buildExamCode(inPersonTitle),
          allowDraft: true,
          allowResume: true,
          maximumAttempts: 1,
          questionCount: 3,
          assignedStudentCount,
          createdBy: teacher._id
        });

        await Question.create([
          {
            examId: exam._id,
            subjectId: subject._id,
            questionOrder: 1,
            type: 'mcq',
            text: 'Which option best describes active learning?',
            marks: 5,
            options: [
              { key: 'A', text: 'Listening only', isCorrect: false },
              { key: 'B', text: 'Participating and practicing', isCorrect: true },
              { key: 'C', text: 'Skipping class', isCorrect: false },
              { key: 'D', text: 'Avoiding homework', isCorrect: false }
            ],
            correctAnswer: 'B',
            createdBy: teacher._id
          },
          {
            examId: exam._id,
            subjectId: subject._id,
            questionOrder: 2,
            type: 'true_false',
            text: 'Punctuality is important for academic success.',
            marks: 5,
            options: [
              { key: 'true', text: 'True', isCorrect: true },
              { key: 'false', text: 'False', isCorrect: false }
            ],
            correctAnswer: 'true',
            createdBy: teacher._id
          },
          {
            examId: exam._id,
            subjectId: subject._id,
            questionOrder: 3,
            type: 'descriptive',
            text: 'Explain one study habit that helps you improve.',
            marks: 10,
            expectedAnswer: 'Any thoughtful habit such as revision schedule, note-taking, or practice.',
            options: [],
            createdBy: teacher._id
          }
        ]);
        created += 1;
        console.log('Created in-person exam:', exam.title);
      }

      if (!existingOnline) {
        const exam = await Exam.create({
          title: onlineTitle,
          description: 'Seeded online examination using a Google Form respondent link.',
          instructions: 'Open the Google Form during the exam window and submit there.',
          category: 'monthly',
          examType: 'monthly',
          deliveryMethod: 'online',
          class: klass._id,
          subject: subject._id,
          teacherId: teacher._id,
          branchId: klass.branchId || subject.branchId || teacher.branchId || null,
          date,
          startTime: '11:00',
          endTime: '12:00',
          durationMinutes: 60,
          totalMarks: 50,
          passingMarks: 25,
          status: 'published',
          isPublished: true,
          publishedAt: new Date(),
          examCode: buildExamCode(onlineTitle),
          googleFormUrl: sampleForm,
          googleSyncStatus: 'manual',
          googleFormId: 'SAMPLE',
          allowDraft: false,
          maximumAttempts: 1,
          assignedStudentCount,
          createdBy: teacher._id
        });
        created += 1;
        console.log('Created online exam:', exam.title);
      }
    }
  }

  console.log(`Done. Created ${created} examinations.`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
