from utu.config import ConfigLoader
from utu.eval.data import DBDataManager
from utu.eval.processer import GAIAProcesser, WebWalkerProcesser

config = ConfigLoader.load_eval_config("ww")


def test_gaia_processor():
    config.data.dataset = "GAIA_val"
    data_manager = DBDataManager(config)
    processor = GAIAProcesser(config)

    sample = data_manager.load()[0]
    print(f"> raw sample: {sample.as_dict()}")
    processor.preprocess_one(sample)
    print(f"> processed sample: {sample.augmented_question}")


def test_webwalker_processor():
    config.data.dataset = "WebWalkerQA"
    data_manager = DBDataManager(config)
    processor = WebWalkerProcesser(config)

    sample = data_manager.load()[0]
    print(f"> raw sample: {sample.as_dict()}")
    processor.preprocess_one(sample)
    print(f"> processed sample: {sample.augmented_question}")
