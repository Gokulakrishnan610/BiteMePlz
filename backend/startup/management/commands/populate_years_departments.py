from django.core.management.base import BaseCommand
from startup.models import AcademicYear, Department


class Command(BaseCommand):
    help = 'Populate default academic years and departments'

    def handle(self, *args, **options):
        # Create default academic years
        years_data = [
            {'code': '1', 'name': 'First Year', 'order': 1},
            {'code': '2', 'name': 'Second Year', 'order': 2},
            {'code': '3', 'name': 'Third Year', 'order': 3},
            {'code': '4', 'name': 'Fourth Year', 'order': 4},
        ]
        
        for year_data in years_data:
            year, created = AcademicYear.objects.get_or_create(
                code=year_data['code'],
                defaults={
                    'name': year_data['name'],
                    'order': year_data['order'],
                    'is_active': True
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created academic year: {year.name}'))
            else:
                self.stdout.write(self.style.WARNING(f'Academic year already exists: {year.name}'))
        
        # Create default departments
        departments_data = [
            {'code': 'CSE', 'name': 'Computer Science and Engineering', 'order': 1},
            {'code': 'ECE', 'name': 'Electronics and Communication Engineering', 'order': 2},
            {'code': 'EEE', 'name': 'Electrical and Electronics Engineering', 'order': 3},
            {'code': 'MECH', 'name': 'Mechanical Engineering', 'order': 4},
            {'code': 'CIVIL', 'name': 'Civil Engineering', 'order': 5},
            {'code': 'IT', 'name': 'Information Technology', 'order': 6},
            {'code': 'AIDS', 'name': 'Artificial Intelligence and Data Science', 'order': 7},
            {'code': 'CSBS', 'name': 'Computer Science and Business Systems', 'order': 8},
        ]
        
        for dept_data in departments_data:
            dept, created = Department.objects.get_or_create(
                code=dept_data['code'],
                defaults={
                    'name': dept_data['name'],
                    'order': dept_data['order'],
                    'is_active': True
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created department: {dept.code} - {dept.name}'))
            else:
                self.stdout.write(self.style.WARNING(f'Department already exists: {dept.code} - {dept.name}'))
        
        self.stdout.write(self.style.SUCCESS('\nSuccessfully populated academic years and departments!'))
