from sqlalchemy.orm import Session
from app.database import engine, Base, SessionLocal
from app.models.game_models import GameExample


def create_tables():
    Base.metadata.create_all(bind=engine)


def populate_game_examples(db: Session):
    examples = [
        {
            "name": "囚徒困境",
            "description": "经典的囚徒困境博弈。两个囚犯可以选择坦白或沉默。如果都沉默，各判1年；如果都坦白，各判8年；如果一个坦白一个沉默，坦白者释放，沉默者判10年。",
            "player1_strategies": ["坦白", "沉默"],
            "player2_strategies": ["坦白", "沉默"],
            "payoff_matrix_player1": [[-8, 0], [-10, -1]],
            "payoff_matrix_player2": [[-8, -10], [0, -1]],
            "category": "经典博弈"
        },
        {
            "name": "性别之战",
            "description": "一对情侣选择活动：看足球或看芭蕾。男方喜欢足球，女方喜欢芭蕾，但他们更愿意在一起而不是分开。",
            "player1_strategies": ["足球", "芭蕾"],
            "player2_strategies": ["足球", "芭蕾"],
            "payoff_matrix_player1": [[2, 0], [0, 1]],
            "payoff_matrix_player2": [[1, 0], [0, 2]],
            "category": "协调博弈"
        },
        {
            "name": "石头剪刀布",
            "description": "经典的零和博弈。石头胜剪刀，剪刀胜布，布胜石头。",
            "player1_strategies": ["石头", "剪刀", "布"],
            "player2_strategies": ["石头", "剪刀", "布"],
            "payoff_matrix_player1": [[0, 1, -1], [-1, 0, 1], [1, -1, 0]],
            "payoff_matrix_player2": [[0, -1, 1], [1, 0, -1], [-1, 1, 0]],
            "category": "零和博弈"
        },
        {
            "name": "猎鹿博弈",
            "description": "两个猎人可以选择猎鹿或猎兔。猎鹿需要合作，猎兔可以单独完成。猎鹿收益更高但需要合作。",
            "player1_strategies": ["猎鹿", "猎兔"],
            "player2_strategies": ["猎鹿", "猎兔"],
            "payoff_matrix_player1": [[4, 1], [3, 2]],
            "payoff_matrix_player2": [[4, 3], [1, 2]],
            "category": "协调博弈"
        },
        {
            "name": "懦夫博弈",
            "description": "两个车手相向而行，可以选择转向或直行。如果都直行，两人都受伤；如果都转向，都是懦夫；如果一个转向一个直行，转向者是懦夫，直行者是英雄。",
            "player1_strategies": ["转向", "直行"],
            "player2_strategies": ["转向", "直行"],
            "payoff_matrix_player1": [[0, -1], [1, -10]],
            "payoff_matrix_player2": [[0, 1], [-1, -10]],
            "category": "斗鸡博弈"
        },
        {
            "name": "协调博弈",
            "description": "两个参与者选择相同策略时获得更高收益的博弈。",
            "player1_strategies": ["策略A", "策略B"],
            "player2_strategies": ["策略A", "策略B"],
            "payoff_matrix_player1": [[2, 0], [0, 2]],
            "payoff_matrix_player2": [[2, 0], [0, 2]],
            "category": "协调博弈"
        },
        {
            "name": "猜硬币",
            "description": "零和博弈。参与者1想和参与者2相同，参与者2想不同。",
            "player1_strategies": ["正面", "反面"],
            "player2_strategies": ["正面", "反面"],
            "payoff_matrix_player1": [[1, -1], [-1, 1]],
            "payoff_matrix_player2": [[-1, 1], [1, -1]],
            "category": "零和博弈"
        }
    ]

    for example_data in examples:
        existing = db.query(GameExample).filter(GameExample.name == example_data["name"]).first()
        if not existing:
            example = GameExample(**example_data)
            db.add(example)

    db.commit()


def main():
    print("Creating tables...")
    create_tables()

    print("Populating game examples...")
    db = SessionLocal()
    try:
        populate_game_examples(db)
        print("Database initialized successfully!")
    finally:
        db.close()


if __name__ == "__main__":
    main()
