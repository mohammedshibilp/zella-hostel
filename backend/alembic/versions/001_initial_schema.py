"""Initial schema for Zella Hostel Management System

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-12 08:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)

    # Rooms table (Exact 23 rooms)
    op.create_table(
        'rooms',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('room_number', sa.String(length=50), nullable=False),
        sa.Column('floor', sa.Integer(), nullable=False),
        sa.Column('capacity', sa.Integer(), nullable=False, default=2),
        sa.Column('room_type', sa.String(length=50), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_rooms_id'), 'rooms', ['id'], unique=False)
    op.create_index(op.f('ix_rooms_room_number'), 'rooms', ['room_number'], unique=True)

    # Beds table
    op.create_table(
        'beds',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('room_id', sa.Integer(), nullable=False),
        sa.Column('bed_number', sa.String(length=50), nullable=False),
        sa.Column('is_occupied', sa.Boolean(), nullable=False, default=False),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_beds_id'), 'beds', ['id'], unique=False)

    # Packages table
    op.create_table(
        'packages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('monthly_fee', sa.Float(), nullable=False),
        sa.Column('security_deposit', sa.Float(), nullable=False, default=0.0),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('amenities', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_packages_id'), 'packages', ['id'], unique=False)
    op.create_index(op.f('ix_packages_name'), 'packages', ['name'], unique=True)

    # Enquiries table
    op.create_table(
        'enquiries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('mode', sa.String(length=50), nullable=False),
        sa.Column('occupation', sa.String(length=50), nullable=False),
        sa.Column('approx_coming_date', sa.Date(), nullable=True),
        sa.Column('package_id', sa.Integer(), nullable=True),
        sa.Column('contact_no', sa.String(length=50), nullable=False),
        sa.Column('current_status', sa.String(length=50), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['package_id'], ['packages.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_enquiries_date'), 'enquiries', ['date'], unique=False)
    op.create_index(op.f('ix_enquiries_id'), 'enquiries', ['id'], unique=False)

    # Guests table
    op.create_table(
        'guests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('contact_no', sa.String(length=50), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('occupation', sa.String(length=100), nullable=True),
        sa.Column('guardian_name', sa.String(length=255), nullable=True),
        sa.Column('guardian_phone', sa.String(length=50), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('id_proof_type', sa.String(length=50), nullable=True),
        sa.Column('id_proof_number', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, default='Active'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_guests_id'), 'guests', ['id'], unique=False)

    # Admissions table
    op.create_table(
        'admissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('guest_id', sa.Integer(), nullable=False),
        sa.Column('room_id', sa.Integer(), nullable=False),
        sa.Column('bed_id', sa.Integer(), nullable=False),
        sa.Column('package_id', sa.Integer(), nullable=True),
        sa.Column('admission_date', sa.Date(), nullable=False),
        sa.Column('security_deposit', sa.Float(), nullable=False, default=0.0),
        sa.Column('monthly_fee', sa.Float(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, default='Active'),
        sa.Column('checkout_date', sa.Date(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['bed_id'], ['beds.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['guest_id'], ['guests.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['package_id'], ['packages.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_admissions_id'), 'admissions', ['id'], unique=False)

    # Bookings table
    op.create_table(
        'bookings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('guest_name', sa.String(length=255), nullable=False),
        sa.Column('contact_no', sa.String(length=50), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('room_id', sa.Integer(), nullable=False),
        sa.Column('bed_id', sa.Integer(), nullable=False),
        sa.Column('package_id', sa.Integer(), nullable=True),
        sa.Column('booking_date', sa.Date(), nullable=False),
        sa.Column('check_in_date', sa.Date(), nullable=False),
        sa.Column('expected_check_out_date', sa.Date(), nullable=True),
        sa.Column('advance_amount', sa.Float(), nullable=False, default=0.0),
        sa.Column('status', sa.String(length=50), nullable=False, default='Confirmed'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['bed_id'], ['beds.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['package_id'], ['packages.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_bookings_id'), 'bookings', ['id'], unique=False)

    # Attendance table
    op.create_table(
        'attendance',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('guest_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, default='Present'),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['guest_id'], ['guests.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_attendance_date'), 'attendance', ['date'], unique=False)
    op.create_index(op.f('ix_attendance_id'), 'attendance', ['id'], unique=False)

    # Fee Receipts table
    op.create_table(
        'fee_receipts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('receipt_no', sa.String(length=100), nullable=False),
        sa.Column('guest_id', sa.Integer(), nullable=False),
        sa.Column('admission_id', sa.Integer(), nullable=True),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('fee_type', sa.String(length=100), nullable=False, default='Hostel Accommodation Fee'),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('discount', sa.Float(), nullable=False, default=0.0),
        sa.Column('paid_amount', sa.Float(), nullable=False),
        sa.Column('balance_amount', sa.Float(), nullable=False, default=0.0),
        sa.Column('payment_mode', sa.String(length=50), nullable=False, default='Cash'),
        sa.Column('payment_reference', sa.String(length=100), nullable=True),
        sa.Column('period_start', sa.Date(), nullable=True),
        sa.Column('period_end', sa.Date(), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['admission_id'], ['admissions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['guest_id'], ['guests.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_fee_receipts_date'), 'fee_receipts', ['date'], unique=False)
    op.create_index(op.f('ix_fee_receipts_id'), 'fee_receipts', ['id'], unique=False)
    op.create_index(op.f('ix_fee_receipts_receipt_no'), 'fee_receipts', ['receipt_no'], unique=True)

    # Account Transactions table
    op.create_table(
        'account_transactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('transaction_type', sa.String(length=50), nullable=False, default='Plain'),
        sa.Column('guest_id', sa.Integer(), nullable=True),
        sa.Column('particulars', sa.String(length=255), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('payment_channel', sa.String(length=50), nullable=False, default='Cash'),
        sa.Column('entry_type', sa.String(length=10), nullable=False, default='Cr'),
        sa.Column('reference_no', sa.String(length=100), nullable=True),
        sa.Column('running_balance', sa.Float(), nullable=True, default=0.0),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['guest_id'], ['guests.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_account_transactions_date'), 'account_transactions', ['date'], unique=False)
    op.create_index(op.f('ix_account_transactions_id'), 'account_transactions', ['id'], unique=False)

    # Maintenance Records table
    op.create_table(
        'maintenance_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('room_id', sa.Integer(), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('priority', sa.String(length=50), nullable=False, default='Medium'),
        sa.Column('status', sa.String(length=50), nullable=False, default='Pending'),
        sa.Column('reported_date', sa.Date(), nullable=False),
        sa.Column('resolved_date', sa.Date(), nullable=True),
        sa.Column('cost', sa.Float(), nullable=True, default=0.0),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_maintenance_records_id'), 'maintenance_records', ['id'], unique=False)

    # Hostel Settings table
    op.create_table(
        'hostel_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('value', sa.Text(), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_hostel_settings_id'), 'hostel_settings', ['id'], unique=False)
    op.create_index(op.f('ix_hostel_settings_key'), 'hostel_settings', ['key'], unique=True)


def downgrade() -> None:
    op.drop_table('hostel_settings')
    op.drop_table('maintenance_records')
    op.drop_table('account_transactions')
    op.drop_table('fee_receipts')
    op.drop_table('attendance')
    op.drop_table('bookings')
    op.drop_table('admissions')
    op.drop_table('guests')
    op.drop_table('enquiries')
    op.drop_table('packages')
    op.drop_table('beds')
    op.drop_table('rooms')
    op.drop_table('users')
