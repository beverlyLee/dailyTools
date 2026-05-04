from alembic import op
import sqlalchemy as sa

revision = '000000000001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'bills',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('date', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('type', sa.Enum('INCOME', 'EXPENSE', name='billtype'), nullable=True),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('source', sa.Enum('WECHAT', 'ALIPAY', 'OCR', name='billsource'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_bills_category'), 'bills', ['category'], unique=False)
    op.create_index(op.f('ix_bills_date'), 'bills', ['date'], unique=False)
    op.create_index(op.f('ix_bills_description'), 'bills', ['description'], unique=False)
    op.create_index(op.f('ix_bills_id'), 'bills', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_bills_id'), table_name='bills')
    op.drop_index(op.f('ix_bills_description'), table_name='bills')
    op.drop_index(op.f('ix_bills_date'), table_name='bills')
    op.drop_index(op.f('ix_bills_category'), table_name='bills')
    op.drop_table('bills')
